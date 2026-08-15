#!/bin/sh
set -eu

. "$(dirname "$0")/_lib.sh"

if [ "$#" -ne 1 ]; then
  echo "Uso: ./restore-check.sh caminho/do/backup.dump" >&2
  exit 1
fi

assert_docker

backup_file="$1"
if [ ! -s "$backup_file" ]; then
  echo "Backup nao encontrado ou vazio: ${backup_file}" >&2
  exit 1
fi

backup_dir="$(CDPATH= cd -- "$(dirname -- "$backup_file")" && pwd)"
file_name="$(basename -- "$backup_file")"

docker run --rm -v "${backup_dir}:/backups" postgres:16 pg_restore -l "/backups/${file_name}" >/dev/null

if command -v sha256sum >/dev/null 2>&1; then
  sha="$(sha256sum "$backup_file" | awk '{print $1}')"
else
  sha="$(shasum -a 256 "$backup_file" | awk '{print $1}')"
fi

echo "Dump valido para listagem pg_restore."
echo "SHA256: ${sha}"
echo "Este script nao restaura sobre producao."
