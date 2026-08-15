#!/bin/sh
set -eu

. "$(dirname "$0")/_lib.sh"

require_env
assert_docker

backup_dir="${BACKUP_DIR:-${DEPLOY_ROOT}/backups}"
timestamp="$(date +%Y-%m-%d_%H-%M-%S)"
file_name="backup-inicial-producao-${timestamp}.dump"
backup_file="${backup_dir}/${file_name}"
container_backup_file="/tmp/${file_name}"
postgres_user="$(env_value POSTGRES_USER techdesk)"
postgres_db="$(env_value POSTGRES_DB techdesk)"

mkdir -p "$backup_dir"

compose exec -T postgres pg_dump -U "$postgres_user" -d "$postgres_db" -Fc -f "$container_backup_file"
container_id="$(compose ps -q postgres)"
docker cp "${container_id}:${container_backup_file}" "$backup_file"
compose exec -T postgres rm -f "$container_backup_file" >/dev/null

if [ ! -s "$backup_file" ]; then
  echo "Backup vazio: ${backup_file}" >&2
  exit 1
fi

docker run --rm -v "${backup_dir}:/backups" postgres:16 pg_restore -l "/backups/${file_name}" >/dev/null

if command -v sha256sum >/dev/null 2>&1; then
  sha="$(sha256sum "$backup_file" | awk '{print $1}')"
else
  sha="$(shasum -a 256 "$backup_file" | awk '{print $1}')"
fi

echo "Backup criado: ${backup_file}"
echo "SHA256: ${sha}"
echo "Copie este backup tambem para outro dispositivo ou host."
