#!/bin/sh
set -eu

. "$(dirname "$0")/_lib.sh"

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Uso: ./restore-check.sh caminho/do/backup.dump [sha256-esperado]" >&2
  exit 1
fi

assert_docker
require_env

backup_file="$1"
expected_sha="${2:-}"
if [ ! -s "$backup_file" ]; then
  echo "Backup nao encontrado ou vazio: ${backup_file}" >&2
  exit 1
fi

backup_dir="$(CDPATH= cd -- "$(dirname -- "$backup_file")" && pwd)"
file_name="$(basename -- "$backup_file")"
postgres_user="$(env_value POSTGRES_USER techdesk)"
temp_db="techdesk_restore_check_$(date +%Y%m%d%H%M%S)_$$"
container_backup_file="/tmp/restore-check-${file_name}"
container_id=""

cleanup() {
  if [ -n "$container_id" ]; then
    compose exec -T postgres dropdb -U "$postgres_user" --if-exists "$temp_db" >/dev/null 2>&1 || true
    compose exec -T postgres rm -f "$container_backup_file" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

docker run --rm -v "${backup_dir}:/backups" postgres:16 pg_restore -l "/backups/${file_name}" >/dev/null

if command -v sha256sum >/dev/null 2>&1; then
  sha="$(sha256sum "$backup_file" | awk '{print $1}')"
else
  sha="$(shasum -a 256 "$backup_file" | awk '{print $1}')"
fi

if [ -n "$expected_sha" ]; then
  expected_upper="$(printf '%s' "$expected_sha" | tr '[:lower:]' '[:upper:]')"
  actual_upper="$(printf '%s' "$sha" | tr '[:lower:]' '[:upper:]')"
  if [ "$expected_upper" != "$actual_upper" ]; then
    echo "SHA256 divergente. Esperado: ${expected_sha}. Atual: ${sha}." >&2
    exit 1
  fi
fi

container_id="$(compose ps -q postgres)"
if [ -z "$container_id" ]; then
  echo "Container postgres nao encontrado. Suba o PostgreSQL antes do restore-check." >&2
  exit 1
fi

docker cp "$backup_file" "${container_id}:${container_backup_file}"
compose exec -T postgres createdb -U "$postgres_user" "$temp_db"
compose exec -T postgres pg_restore -U "$postgres_user" -d "$temp_db" "$container_backup_file"

validate_sql() {
  compose exec -T postgres psql -U "$postgres_user" -d "$temp_db" -v ON_ERROR_STOP=1 -c "$1" >/dev/null
}

validate_sql 'select count(*) as migrations from "_prisma_migrations";'
validate_sql 'select count(*) as users from "User";'
validate_sql 'select count(*) as customers from "Customer";'
validate_sql 'select count(*) as equipments from "Equipment";'
validate_sql 'select count(*) as service_orders from "ServiceOrder";'
validate_sql 'select count(*) as accessories from "Accessory";'
validate_sql 'select count(*) as budgets from "Budget";'
validate_sql 'select count(*) as budget_items from "BudgetItem";'
validate_sql 'select count(*) as parts from "Part";'
validate_sql 'select count(*) as stock_movements from "StockMovement";'
validate_sql 'select count(*) as service_order_histories from "ServiceOrderHistory";'
validate_sql 'select count(*) as company_settings from "CompanySettings";'
validate_sql 'select count(*) as orphan_equipment from "Equipment" e left join "Customer" c on c.id = e."customerId" where c.id is null;'
validate_sql 'select count(*) as orphan_service_order_customer from "ServiceOrder" s left join "Customer" c on c.id = s."customerId" where c.id is null;'
validate_sql 'select count(*) as orphan_service_order_equipment from "ServiceOrder" s left join "Equipment" e on e.id = s."equipmentId" where e.id is null;'

echo "Dump valido para listagem pg_restore."
echo "Restore isolado concluido no banco temporario ${temp_db}."
echo "Tabelas criticas e relacoes basicas validadas."
echo "SHA256: ${sha}"
echo "Este script nao restaura sobre producao."
