#!/bin/sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)"
RUNTIME="$(mktemp -d "${REPO_ROOT}/.stage4-backup-real.XXXXXX")"
PROJECT="techdesk-stage4-real-$$"

cleanup() {
  case "$PROJECT" in techdesk-stage4-real-*)
    if [ -x "$RUNTIME/bin/docker" ]; then
      PATH="$RUNTIME/bin:$PATH" docker compose --project-directory "$RUNTIME" -p "$PROJECT" --env-file "$RUNTIME/.env" -f "$RUNTIME/docker-compose.yml" down -v --remove-orphans >/dev/null 2>&1 || true
    fi
  esac
  case "$RUNTIME" in "${REPO_ROOT}"/.stage4-backup-real.*) rm -rf "$RUNTIME" ;; esac
}
trap cleanup EXIT HUP INT TERM

mkdir -p "$RUNTIME/bin" "$RUNTIME/logs" "$RUNTIME/backups"
for file in techdesk setup-core.sh observability.sh backup-contracts.sh backup.sh restore-check.sh _lib.sh; do
  cp "$REPO_ROOT/deploy/$file" "$RUNTIME/$file"
done
chmod 755 "$RUNTIME/techdesk" "$RUNTIME"/*.sh

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  native_docker="$(command -v docker)"
  printf '#!/bin/sh\nexec %s "$@"\n' "$native_docker" > "$RUNTIME/bin/docker"
else
  docker_exe="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
  [ -x "$docker_exe" ] || { echo "Docker engine unavailable for real Stage 4 integration." >&2; exit 1; }
  cat > "$RUNTIME/bin/docker" <<'PY'
#!/usr/bin/python3
import os
import subprocess
import sys

executable = "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
converted = []
for argument in sys.argv[1:]:
    if argument.startswith("/mnt/"):
        separator = argument.find(":/", 5)
        source = argument if separator < 0 else argument[:separator]
        suffix = "" if separator < 0 else argument[separator:]
        source = subprocess.check_output(["wslpath", "-w", source], text=True).strip()
        argument = source + suffix
    converted.append(argument)
os.execv(executable, [executable, *converted])
PY
fi
chmod 755 "$RUNTIME/bin/docker"
PATH="$RUNTIME/bin:$PATH"
export PATH TECHDESK_RUNTIME_ROOT="$RUNTIME"

compose() {
  docker compose --project-directory "$RUNTIME" -p "$PROJECT" --env-file "$RUNTIME/.env" -f "$RUNTIME/docker-compose.yml" "$@"
}

postgres_ready() {
  # The official image briefly accepts connections from a temporary postmaster
  # during initialization. PID 1 becomes postgres only after that server stops
  # and the final postmaster starts.
  [ "$(compose exec -T postgres sh -c 'cat /proc/1/comm' 2>/dev/null || true)" = "postgres" ] || return 1
  compose exec -T postgres pg_isready -U techdesk -d techdesk >/dev/null 2>&1 || return 1
  [ "$(compose exec -T postgres psql -U techdesk -d techdesk -At -v ON_ERROR_STOP=1 -c 'SELECT 1;' 2>/dev/null || true)" = "1" ]
}

postgres_diagnostics() {
  echo "PostgreSQL readiness diagnostics:" >&2
  docker ps --filter "label=com.docker.compose.project=$PROJECT" --no-trunc >&2 || true
  compose ps --all >&2 || true
  container_id="$(compose ps --all -q postgres 2>/dev/null || true)"
  if [ -n "$container_id" ]; then
    docker inspect --format 'state={{.State.Status}} running={{.State.Running}} restarting={{.State.Restarting}} exitCode={{.State.ExitCode}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container_id" >&2 || true
    echo "Last PostgreSQL logs:" >&2
    docker logs --tail 100 "$container_id" >&2 || true
  fi
}

cat > "$RUNTIME/docker-compose.yml" <<'YAML'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
YAML
cat > "$RUNTIME/.env" <<EOF
TECHDESK_PROJECT_NAME=$PROJECT
POSTGRES_USER=techdesk
POSTGRES_PASSWORD=stage4-isolated-password
POSTGRES_DB=techdesk
JWT_SECRET=stage4-isolated-jwt-secret
EOF
chmod 600 "$RUNTIME/.env"
printf '1.2.0\n' > "$RUNTIME/VERSION"
printf '%s\n' "{\"installationId\":\"stage4-real\",\"version\":\"1.2.0\",\"projectName\":\"$PROJECT\",\"frontendPort\":\"18080\"}" > "$RUNTIME/techdesk-installation.json"

compose up -d postgres >/dev/null
ready=0
for _attempt in $(seq 1 30); do
  if postgres_ready; then ready=1; break; fi
  sleep 1
done
[ "$ready" -eq 1 ] || { echo "Isolated PostgreSQL did not become ready." >&2; postgres_diagnostics; exit 1; }

docker compose --project-directory "$RUNTIME" -p "$PROJECT" --env-file "$RUNTIME/.env" -f "$RUNTIME/docker-compose.yml" exec -T postgres psql -U techdesk -d techdesk -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
CREATE TABLE "_prisma_migrations" (id text primary key);
CREATE TABLE "User" (id text primary key);
CREATE TABLE "Customer" (id text primary key);
CREATE TABLE "Equipment" (id text primary key, "customerId" text);
CREATE TABLE "ServiceOrder" (id text primary key, "customerId" text, "equipmentId" text);
CREATE TABLE "Accessory" (id text primary key);
CREATE TABLE "Budget" (id text primary key);
CREATE TABLE "BudgetItem" (id text primary key);
CREATE TABLE "Part" (id text primary key);
CREATE TABLE "StockMovement" (id text primary key);
CREATE TABLE "ServiceOrderHistory" (id text primary key);
CREATE TABLE "CompanySettings" (id text primary key);
INSERT INTO "_prisma_migrations" VALUES ('stage4-real');
INSERT INTO "User" VALUES ('production-sentinel');
SQL

created="$($RUNTIME/techdesk backup --json)"
backup_id="$(printf '%s' "$created" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["backup"]["backupId"])')"
checked="$($RUNTIME/techdesk backup-check --id "$backup_id" --json)"
restored="$($RUNTIME/techdesk restore-check --id "$backup_id" --json)"

printf '%s' "$created" | python3 -c 'import json,sys; value=json.load(sys.stdin); assert value["code"] == "BACKUP_CREATED"; assert "path" not in str(value).lower()'
printf '%s' "$checked" | python3 -c 'import json,sys; assert json.load(sys.stdin)["code"] == "BACKUP_CHECK_PASSED"'
printf '%s' "$restored" | python3 -c 'import json,sys; value=json.load(sys.stdin); assert value["code"] == "RESTORE_CHECK_PASSED"; assert value["data"]["isolation"] == {"database":"TEMPORARY","productionDatabaseTouched":False,"cleanup":"PASS"}'

production_count="$(docker compose --project-directory "$RUNTIME" -p "$PROJECT" --env-file "$RUNTIME/.env" -f "$RUNTIME/docker-compose.yml" exec -T postgres psql -U techdesk -d techdesk -At -c 'select count(*) from "User";' | tr -d '\r')"
temporary_count="$(docker compose --project-directory "$RUNTIME" -p "$PROJECT" --env-file "$RUNTIME/.env" -f "$RUNTIME/docker-compose.yml" exec -T postgres psql -U techdesk -d postgres -At -c "select count(*) from pg_database where datname like 'techdesk_restore_check_%';" | tr -d '\r')"
[ "$production_count" = "1" ]
[ "$temporary_count" = "0" ]
[ "$(find "$RUNTIME/backups" -maxdepth 1 -type f -name 'backup-inicial-producao-*.dump' | wc -l)" -eq 1 ]
[ "$(find "$RUNTIME/backups" -maxdepth 1 -type f -name '.backup-in-progress-*' | wc -l)" -eq 0 ]

echo "Real PostgreSQL backup, validation and isolated restore-check: PASS"
