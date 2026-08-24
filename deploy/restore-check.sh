#!/bin/sh
set -eu

. "$(dirname "$0")/_lib.sh"

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Uso: ./restore-check.sh caminho/do/backup.dump [sha256-esperado]" >&2
  exit 2
fi

assert_docker
require_env

backup_file="$1"
expected_sha="${2:-}"
if [ ! -f "$backup_file" ] || [ -L "$backup_file" ] || [ ! -s "$backup_file" ]; then
  echo "Backup nao encontrado, vazio ou inseguro." >&2
  exit 10
fi

backup_dir="$(CDPATH= cd -- "$(dirname -- "$backup_file")" && pwd -P)"
file_name="$(basename -- "$backup_file")"
postgres_user="$(env_value POSTGRES_USER techdesk)"
temp_db="techdesk_restore_check_$(date +%Y%m%d%H%M%S)_$$"
container_backup_file="/tmp/restore-check-${file_name}"
container_id=""
cleanup_needed=0
cleanup_complete=0

cleanup_resources() {
  cleanup_failed=0
  if [ -n "$container_id" ]; then
    compose exec -T postgres dropdb -U "$postgres_user" --if-exists "$temp_db" >/dev/null 2>&1 || cleanup_failed=1
    compose exec -T postgres rm -f "$container_backup_file" >/dev/null 2>&1 || cleanup_failed=1
  fi
  [ "$cleanup_failed" -eq 0 ]
}

on_exit() {
  if [ "$cleanup_needed" -eq 1 ] && [ "$cleanup_complete" -eq 0 ]; then
    cleanup_resources || true
  fi
}
trap on_exit EXIT HUP INT TERM

if ! docker run --rm -v "${backup_dir}:/backups:ro" postgres:16 pg_restore -l "/backups/${file_name}" >/dev/null; then
  echo "Dump invalido para pg_restore." >&2
  exit 30
fi

if command -v sha256sum >/dev/null 2>&1; then
  sha="$(sha256sum "$backup_file" | awk '{print $1}')"
else
  sha="$(shasum -a 256 "$backup_file" | awk '{print $1}')"
fi
if [ -n "$expected_sha" ] && [ "$expected_sha" != "$sha" ]; then
  echo "SHA256 divergente." >&2
  exit 31
fi

container_id="$(compose ps -q postgres 2>/dev/null || true)"
if [ -z "$container_id" ]; then
  echo "Container postgres nao encontrado. Suba o PostgreSQL antes do restore-check." >&2
  exit 20
fi
cleanup_needed=1
if ! docker cp "$backup_file" "${container_id}:${container_backup_file}"; then
  echo "Falha ao copiar backup para o ambiente isolado." >&2
  exit 21
fi
if ! compose exec -T postgres createdb -U "$postgres_user" "$temp_db"; then
  echo "Falha ao criar banco temporario isolado." >&2
  exit 22
fi
if ! compose exec -T postgres pg_restore -U "$postgres_user" -d "$temp_db" "$container_backup_file"; then
  echo "Falha ao restaurar no banco temporario isolado." >&2
  exit 23
fi

validate_sql() {
  compose exec -T postgres psql -U "$postgres_user" -d "$temp_db" -v ON_ERROR_STOP=1 -c "$1" >/dev/null
}

for query in \
  'select count(*) as migrations from "_prisma_migrations";' \
  'select count(*) as users from "User";' \
  'select count(*) as customers from "Customer";' \
  'select count(*) as equipments from "Equipment";' \
  'select count(*) as service_orders from "ServiceOrder";' \
  'select count(*) as accessories from "Accessory";' \
  'select count(*) as budgets from "Budget";' \
  'select count(*) as budget_items from "BudgetItem";' \
  'select count(*) as parts from "Part";' \
  'select count(*) as stock_movements from "StockMovement";' \
  'select count(*) as service_order_histories from "ServiceOrderHistory";' \
  'select count(*) as company_settings from "CompanySettings";' \
  'select count(*) as orphan_equipment from "Equipment" e left join "Customer" c on c.id = e."customerId" where c.id is null;' \
  'select count(*) as orphan_service_order_customer from "ServiceOrder" s left join "Customer" c on c.id = s."customerId" where c.id is null;' \
  'select count(*) as orphan_service_order_equipment from "ServiceOrder" s left join "Equipment" e on e.id = s."equipmentId" where e.id is null;'
do
  if ! validate_sql "$query"; then
    echo "Validacao de schema ou dados minimos falhou no banco isolado." >&2
    exit 32
  fi
done

if ! cleanup_resources; then
  echo "Restore-check concluiu, mas o cleanup isolado falhou." >&2
  exit 41
fi
cleanup_complete=1

echo "Dump valido para listagem pg_restore."
echo "Restore isolado concluido e removido."
echo "Tabelas criticas e relacoes basicas validadas."
echo "SHA256: ${sha}"
echo "Este script nao restaura sobre producao."
