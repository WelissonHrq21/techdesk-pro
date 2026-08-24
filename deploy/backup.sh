#!/bin/sh
set -eu

. "$(dirname "$0")/_lib.sh"

require_env
assert_docker

backup_dir="${BACKUP_DIR:-${DEPLOY_ROOT}/backups}"
timestamp="$(date +%Y-%m-%d_%H-%M-%S)"
created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
file_name="backup-inicial-producao-${timestamp}.dump"
backup_file="${backup_dir}/${file_name}"
temporary_name=".backup-in-progress-${timestamp}-$$.dump"
temporary_file="${backup_dir}/${temporary_name}"
container_backup_file="/tmp/${temporary_name}"
postgres_user="$(env_value POSTGRES_USER techdesk)"
postgres_db="$(env_value POSTGRES_DB techdesk)"
container_id=""
finalized=0

cleanup() {
  if [ -n "$container_id" ]; then
    compose exec -T postgres rm -f "$container_backup_file" >/dev/null 2>&1 || true
  fi
  if [ "$finalized" -eq 0 ]; then
    rm -f "$temporary_file"
  fi
}
trap cleanup EXIT HUP INT TERM

mkdir -p "$backup_dir"
chmod 700 "$backup_dir" 2>/dev/null || true
[ ! -e "$backup_file" ] && [ ! -L "$backup_file" ] || {
  echo "Ja existe um backup para este timestamp." >&2
  exit 12
}

database_bytes="$(compose exec -T postgres psql -U "$postgres_user" -d "$postgres_db" -At -v ON_ERROR_STOP=1 -c "select pg_database_size(current_database());" 2>/dev/null || true)"
case "$database_bytes" in
  ''|*[!0-9]*)
    echo "PostgreSQL indisponivel para preflight do backup." >&2
    exit 20
    ;;
esac
free_kib="$(df -Pk "$backup_dir" 2>/dev/null | awk 'NR == 2 {print $4}' || true)"
case "$free_kib" in
  ''|*[!0-9]*)
    echo "Espaco livre indisponivel para preflight do backup." >&2
    exit 10
    ;;
esac
free_bytes=$((free_kib * 1024))
required_bytes=$((database_bytes * 2 + 64 * 1024 * 1024))
minimum_bytes=$((256 * 1024 * 1024))
[ "$required_bytes" -ge "$minimum_bytes" ] || required_bytes="$minimum_bytes"
if [ "$free_bytes" -lt "$required_bytes" ]; then
  echo "Espaco livre insuficiente para criar backup com seguranca." >&2
  exit 11
fi

if ! compose exec -T postgres pg_dump -U "$postgres_user" -d "$postgres_db" -Fc -f "$container_backup_file"; then
  echo "pg_dump falhou; nenhum backup foi finalizado." >&2
  exit 21
fi
container_id="$(compose ps -q postgres 2>/dev/null || true)"
[ -n "$container_id" ] || {
  echo "Container PostgreSQL nao encontrado." >&2
  exit 22
}
if ! docker cp "${container_id}:${container_backup_file}" "$temporary_file"; then
  echo "Falha ao copiar dump temporario." >&2
  exit 23
fi
compose exec -T postgres rm -f "$container_backup_file" >/dev/null
container_id=""

if [ ! -s "$temporary_file" ] || [ -L "$temporary_file" ]; then
  echo "Backup temporario vazio ou inseguro." >&2
  exit 24
fi
if ! docker run --rm -v "${backup_dir}:/backups:ro" postgres:16 pg_restore -l "/backups/${temporary_name}" >/dev/null; then
  echo "Dump temporario rejeitado por pg_restore." >&2
  exit 30
fi

if command -v sha256sum >/dev/null 2>&1; then
  sha="$(sha256sum "$temporary_file" | awk '{print $1}')"
else
  sha="$(shasum -a 256 "$temporary_file" | awk '{print $1}')"
fi
case "$sha" in
  *[!a-f0-9]*|'') echo "Falha ao calcular SHA256." >&2; exit 31 ;;
esac
[ "${#sha}" -eq 64 ] || { echo "SHA256 invalido." >&2; exit 31; }
size_bytes="$(stat -c %s "$temporary_file" 2>/dev/null || true)"
case "$size_bytes" in ''|*[!0-9]*) echo "Tamanho do backup invalido." >&2; exit 31 ;; esac

chmod 600 "$temporary_file"
if sync -f "$temporary_file" 2>/dev/null; then :; else sync "$temporary_file"; fi
mv "$temporary_file" "$backup_file"
finalized=1
if sync -f "$backup_dir" 2>/dev/null; then :; else sync; fi

if [ "${TECHDESK_CONTRACT_RECEIPT:-0}" = "1" ]; then
  printf '%s\t%s\t%s\t%s\n' "$file_name" "$created_at" "$size_bytes" "$sha" >&3
fi

echo "Backup criado: ${backup_file}"
echo "SHA256: ${sha}"
echo "Copie este backup tambem para outro dispositivo ou host."
