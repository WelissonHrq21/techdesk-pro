#!/bin/sh
set -eu

DEPLOY_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV_FILE="${DEPLOY_ROOT}/.env"
COMPOSE_FILE="${DEPLOY_ROOT}/docker-compose.yml"
BACKUP_DIR="${BACKUP_DIR:-${DEPLOY_ROOT}/backups}"
VERSION="$(cat "${DEPLOY_ROOT}/VERSION")"

env_value() {
  name="$1"
  default="${2:-}"

  if [ ! -f "$ENV_FILE" ]; then
    printf '%s' "$default"
    return
  fi

  value="$(grep -E "^${name}=" "$ENV_FILE" 2>/dev/null | tail -n 1 | sed "s/^${name}=//" || true)"
  if [ -n "$value" ]; then
    printf '%s' "$value"
  else
    printf '%s' "$default"
  fi
}

project_name() {
  env_value TECHDESK_PROJECT_NAME techdesk-prod
}

techdesk_port() {
  env_value TECHDESK_PORT 8080
}

compose() {
  docker compose --project-directory "$DEPLOY_ROOT" -p "$(project_name)" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

require_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo ".env nao encontrado em ${ENV_FILE}. Execute install.sh primeiro." >&2
    exit 1
  fi
}

assert_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker nao encontrado. Instale Docker Engine + Compose." >&2
    exit 1
  fi

  docker compose version >/dev/null
  docker info >/dev/null 2>&1 || {
    echo "Docker daemon nao esta rodando." >&2
    exit 1
  }
}

hex_secret() {
  bytes="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
  else
    tr -dc 'a-f0-9' </dev/urandom | head -c $((bytes * 2))
  fi
}

base_url() {
  port="$(techdesk_port)"
  if [ "$port" = "80" ]; then
    printf 'http://127.0.0.1'
  else
    printf 'http://127.0.0.1:%s' "$port"
  fi
}

show_urls() {
  port="$(techdesk_port)"
  suffix=""
  if [ "$port" != "80" ]; then
    suffix=":${port}"
  fi

  echo "Possiveis URLs de acesso:"
  echo "  http://localhost${suffix}"
  echo "  http://$(hostname)${suffix}"
  if command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.' | while read -r ip; do
      [ -n "$ip" ] && echo "  http://${ip}${suffix}"
    done
  fi
}

wait_ready() {
  timeout="${1:-120}"
  end=$(( $(date +%s) + timeout ))
  url="$(base_url)"

  while [ "$(date +%s)" -lt "$end" ]; do
    if curl -fsS "${url}/health" >/dev/null 2>&1 && curl -fsS "${url}/api/ready" >/dev/null 2>&1; then
      echo "TechDesk Pro esta healthy/ready."
      return 0
    fi
    sleep 5
  done

  echo "Timeout aguardando healthchecks." >&2
  compose ps || true
  compose logs --tail 80 api || true
  return 1
}
