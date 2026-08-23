#!/bin/sh
set -eu

if [ -z "${DEPLOY_ROOT:-}" ]; then
  DEPLOY_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
fi

ENV_FILE="${ENV_FILE:-${DEPLOY_ROOT}/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${DEPLOY_ROOT}/docker-compose.yml}"
METADATA_FILE="${METADATA_FILE:-${DEPLOY_ROOT}/techdesk-installation.json}"
LOG_DIR="${LOG_DIR:-${DEPLOY_ROOT}/logs}"
BACKUP_DIR="${BACKUP_DIR:-${DEPLOY_ROOT}/backups}"
RUNTIME_ROOT="${TECHDESK_RUNTIME_ROOT:-/opt/techdesk-pro}"
INSTALLER_VERSION="${INSTALLER_VERSION:-1.2.0}"
UNKNOWN_VERSION="UNKNOWN"
DEFAULT_VERSION="$(sed -n '1{s/[[:space:]]//g;p;q;}' "${DEPLOY_ROOT}/VERSION" 2>/dev/null || true)"
DEFAULT_VERSION="${DEFAULT_VERSION:-$UNKNOWN_VERSION}"
DEFAULT_PROJECT_NAME="${DEFAULT_PROJECT_NAME:-techdesk-prod}"
DEFAULT_PORT="${DEFAULT_PORT:-8080}"
SETUP_LOG_FILE="${SETUP_LOG_FILE:-}"

setup_timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

setup_log_init() {
  mkdir -p "$LOG_DIR"
  SETUP_LOG_FILE="${LOG_DIR}/setup-$(date +%Y-%m-%d_%H%M%S).log"
  chmod 700 "$LOG_DIR" 2>/dev/null || true
  {
    echo "timestamp=$(setup_timestamp)"
    echo "installerVersion=${INSTALLER_VERSION}"
    echo "targetVersion=${TECHDESK_TARGET_VERSION:-${DEFAULT_VERSION}}"
    echo "deployRoot=${DEPLOY_ROOT}"
    echo "os=$(uname -s 2>/dev/null || printf unknown)"
    echo "arch=$(uname -m 2>/dev/null || printf unknown)"
  } >> "$SETUP_LOG_FILE"
  chmod 600 "$SETUP_LOG_FILE" 2>/dev/null || true
}

require_operation_access() {
  operation="$1"
  needs_env_write="${2:-0}"
  access_ok=1

  [ -d "$DEPLOY_ROOT" ] && [ -w "$DEPLOY_ROOT" ] || access_ok=0
  [ -d "$LOG_DIR" ] && [ -w "$LOG_DIR" ] || access_ok=0

  case "$operation" in
    install)
      ;;
    repair)
      [ -r "$ENV_FILE" ] || access_ok=0
      if [ -f "$METADATA_FILE" ]; then
        [ -w "$METADATA_FILE" ] || access_ok=0
      fi
      ;;
    upgrade|backup|restore-check)
      [ -r "$ENV_FILE" ] || access_ok=0
      [ -d "$BACKUP_DIR" ] && [ -w "$BACKUP_DIR" ] || access_ok=0
      ;;
  esac

  if [ "$needs_env_write" = "1" ]; then
    [ -w "$ENV_FILE" ] || access_ok=0
  fi

  [ "$access_ok" -eq 1 ] && return 0

  fail "Esta operacao requer privilegios administrativos. Execute novamente com sudo."
}

physical_path() {
  path="$1"
  if [ -d "$path" ]; then
    (CDPATH= cd -- "$path" && pwd -P)
    return
  fi
  parent="$(dirname -- "$path")"
  leaf="$(basename -- "$path")"
  if [ -d "$parent" ]; then
    printf '%s/%s' "$(CDPATH= cd -- "$parent" && pwd -P)" "$leaf"
  else
    printf '%s' "$path"
  fi
}

is_runtime_root() {
  [ "$(physical_path "$DEPLOY_ROOT")" = "$(physical_path "$RUNTIME_ROOT")" ]
}

runtime_file_list() {
  cat <<EOF
techdesk
setup-core.sh
install.sh
start.sh
stop.sh
restart.sh
status.sh
backup.sh
restore-check.sh
_lib.sh
docker-compose.yml
seed-admin.js
VERSION
.env.example
README-INSTALL.md
README-BACKUP-RESTORE.md
nginx/default.conf
EOF
}

ensure_runtime_privileges() {
  if [ -d "$RUNTIME_ROOT" ] && [ -w "$RUNTIME_ROOT" ]; then
    return 0
  fi

  if [ "$(id -u 2>/dev/null || printf 1)" = "0" ]; then
    mkdir -p "$RUNTIME_ROOT"
    return 0
  fi

  if ! command -v sudo >/dev/null 2>&1; then
    fail "Esta operacao requer privilegios administrativos. Execute com sudo ou defina TECHDESK_RUNTIME_ROOT para um caminho persistente gravavel."
    return 1
  fi

  fail "Esta operacao requer privilegios administrativos. Execute novamente com sudo."
}

reexec_with_admin_privileges() {
  command_name="$1"
  shift

  [ "$(id -u 2>/dev/null || printf 1)" != "0" ] || return 0
  [ -d "$RUNTIME_ROOT" ] && [ -w "$RUNTIME_ROOT" ] && return 0

  if ! command -v sudo >/dev/null 2>&1; then
    fail "Esta operacao requer privilegios administrativos e sudo nao esta disponivel."
    exit 1
  fi

  echo "Esta operacao requer privilegios administrativos. Solicitando sudo antes de modificar o runtime."
  exec sudo env TECHDESK_RUNTIME_ROOT="$RUNTIME_ROOT" "${DEPLOY_ROOT}/techdesk" "$command_name" "$@"
}

sync_runtime_from_source() {
  ensure_runtime_privileges || return 1

  staging="${RUNTIME_ROOT}/.runtime-staging-$$"
  rm -rf "$staging"
  mkdir -p "$staging/nginx" "$staging/logs" "$staging/backups"

  runtime_file_list | while IFS= read -r file; do
    [ -n "$file" ] || continue
    if [ ! -f "${DEPLOY_ROOT}/${file}" ]; then
      echo "Arquivo obrigatorio ausente no installer: ${file}" >&2
      exit 1
    fi
    mkdir -p "${staging}/$(dirname -- "$file")"
    cp "${DEPLOY_ROOT}/${file}" "${staging}/${file}"
  done

  chmod 755 "$staging/techdesk" "$staging"/*.sh 2>/dev/null || true
  chmod 644 \
    "$staging/VERSION" \
    "$staging/.env.example" \
    "$staging/README-INSTALL.md" \
    "$staging/README-BACKUP-RESTORE.md" \
    "$staging/docker-compose.yml" \
    "$staging/seed-admin.js" \
    "$staging/nginx/default.conf" || {
      echo "Falha ao aplicar permissoes publicas no runtime staging." >&2
      return 1
    }
  chmod 700 "$staging/logs" "$staging/backups" 2>/dev/null || true

  runtime_file_list | while IFS= read -r file; do
    [ -n "$file" ] || continue
    [ -s "${staging}/${file}" ] || {
      echo "Runtime staging invalido: ${file}" >&2
      exit 1
    }
  done

  mkdir -p "$RUNTIME_ROOT/nginx" "$RUNTIME_ROOT/logs" "$RUNTIME_ROOT/backups"
  runtime_file_list | while IFS= read -r file; do
    [ -n "$file" ] || continue
    mkdir -p "${RUNTIME_ROOT}/$(dirname -- "$file")"
    cp "${staging}/${file}" "${RUNTIME_ROOT}/${file}"
  done
  chmod 755 "${RUNTIME_ROOT}/techdesk" "${RUNTIME_ROOT}"/*.sh 2>/dev/null || true
  chmod 644 \
    "${RUNTIME_ROOT}/VERSION" \
    "${RUNTIME_ROOT}/.env.example" \
    "${RUNTIME_ROOT}/README-INSTALL.md" \
    "${RUNTIME_ROOT}/README-BACKUP-RESTORE.md" \
    "${RUNTIME_ROOT}/docker-compose.yml" \
    "${RUNTIME_ROOT}/seed-admin.js" \
    "${RUNTIME_ROOT}/nginx/default.conf" || {
      echo "Falha ao aplicar permissoes publicas no runtime permanente." >&2
      return 1
    }
  chmod 700 "${RUNTIME_ROOT}/logs" "${RUNTIME_ROOT}/backups" 2>/dev/null || true
  rm -rf "$staging"
}

runtime_has_cli() {
  [ -x "${RUNTIME_ROOT}/techdesk" ]
}

ensure_or_delegate_runtime() {
  command_name="$1"
  shift

  is_runtime_root && return 0

  case "$command_name" in
    install)
      reexec_with_admin_privileges "$command_name" "$@"
      sync_runtime_from_source || exit 1
      echo "Runtime permanente preparado em ${RUNTIME_ROOT}."
      echo "Continuando instalacao a partir do runtime permanente."
      exec "${RUNTIME_ROOT}/techdesk" install "$@"
      ;;
    upgrade)
      if ! runtime_has_cli; then
        fail "Instalacao persistente nao encontrada em ${RUNTIME_ROOT}. Execute install primeiro."
        exit 1
      fi
      reexec_with_admin_privileges "$command_name" "$@"
      sync_runtime_from_source || exit 1
      echo "Runtime permanente atualizado a partir do pacote em ${RUNTIME_ROOT}."
      exec "${RUNTIME_ROOT}/techdesk" upgrade "$@"
      ;;
    status|repair|backup|restore-check)
      if ! runtime_has_cli; then
        fail "Instalacao persistente nao encontrada em ${RUNTIME_ROOT}. Execute ${RUNTIME_ROOT}/techdesk install."
        exit 1
      fi
      exec "${RUNTIME_ROOT}/techdesk" "$command_name" "$@"
      ;;
  esac

  return 0
}

redact() {
  sed -E \
    -e 's#((^|[[:space:],{])["'\'']?(POSTGRES_PASSWORD|JWT_SECRET|ADMIN_PASSWORD)["'\'']?[[:space:]]*[:=][[:space:]]*)["'\'']?[^"'\''[:space:],}]+["'\'']?#\1[REDACTED]#Ig' \
    -e 's#([A-Za-z][A-Za-z0-9+.-]*://[^:/@[:space:]]+:)[^@[:space:]]+@#\1[REDACTED]@#g' \
    -e 's/(Authorization:[[:space:]]*Bearer[[:space:]]+)[A-Za-z0-9._~+\/=-]+/\1[REDACTED]/Ig' \
    -e 's/(Bearer[[:space:]]+)[A-Za-z0-9._~+\/=-]+/\1[REDACTED]/Ig' \
    -e 's/(publicToken["'\'']?[[:space:]]*[:=][[:space:]]*["'\'']?)[A-Za-z0-9-]+/\1[REDACTED]/Ig'
}

log_line() {
  message="$*"
  [ -n "$SETUP_LOG_FILE" ] || return 0
  printf '%s %s\n' "$(setup_timestamp)" "$message" | redact >> "$SETUP_LOG_FILE"
}

say() {
  printf '%s\n' "$*"
  log_line "$*"
}

fail() {
  say "ERROR: $*"
  return 1
}

run_logged() {
  label="$1"
  shift
  tmp="${LOG_DIR}/setup-command-$$.tmp"
  log_line "RUN ${label}: $*"
  "$@" >"$tmp" 2>&1 || {
    code="$?"
    redact < "$tmp" >> "$SETUP_LOG_FILE"
    rm -f "$tmp"
    log_line "FAILED ${label}: exit=${code}"
    return "$code"
  }
  redact < "$tmp" >> "$SETUP_LOG_FILE"
  rm -f "$tmp"
  return 0
}

validate_compose_config() {
  tmp="${LOG_DIR}/setup-compose-config-$$.tmp"
  log_line "RUN compose config validation"
  compose config >"$tmp" 2>&1 || {
    code="$?"
    say "Compose configuration: FAIL"
    redact < "$tmp" >> "$SETUP_LOG_FILE"
    rm -f "$tmp"
    log_line "FAILED compose config validation: exit=${code}"
    return "$code"
  }
  rm -f "$tmp"
  say "Compose configuration: OK"
  return 0
}

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
  metadata_project="$(metadata_value projectName "")"
  env_value TECHDESK_PROJECT_NAME "${metadata_project:-$DEFAULT_PROJECT_NAME}"
}

techdesk_port() {
  metadata_port="$(metadata_value frontendPort "")"
  env_value TECHDESK_PORT "${metadata_port:-$DEFAULT_PORT}"
}

base_url() {
  port="$(techdesk_port)"
  if [ "$port" = "80" ]; then
    printf 'http://127.0.0.1'
  else
    printf 'http://127.0.0.1:%s' "$port"
  fi
}

compose() {
  docker compose --project-directory "$DEPLOY_ROOT" -p "$(project_name)" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

validate_port() {
  port="$1"
  case "$port" in
    ''|*[!0-9]*)
      return 1
      ;;
  esac
  [ "$port" -ge 1 ] 2>/dev/null && [ "$port" -le 65535 ] 2>/dev/null
}

port_in_use() {
  port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn | awk '{print $4}' | grep -Eq "[:.]${port}$"
    return "$?"
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return "$?"
  fi
  return 1
}

hex_secret() {
  bytes="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
  else
    dd if=/dev/urandom bs="$bytes" count=1 2>/dev/null | od -An -tx1 | tr -d ' \n'
  fi
}

semver_normalize() {
  printf '%s' "$1" | sed -E 's/^v//; s/[^0-9.].*$//'
}

semver_is_valid() {
  printf '%s' "$1" | grep -Eq '^v?[0-9]+\.[0-9]+\.[0-9]+(-rc\.[1-9][0-9]*)?$'
}

semver_cmp() {
  semver_is_valid "$1" || return 2
  semver_is_valid "$2" || return 2
  a="$(semver_normalize "$1")"
  b="$(semver_normalize "$2")"
  a1="$(printf '%s' "$a" | cut -d. -f1)"
  a2="$(printf '%s' "$a" | cut -d. -f2)"
  a3="$(printf '%s' "$a" | cut -d. -f3)"
  b1="$(printf '%s' "$b" | cut -d. -f1)"
  b2="$(printf '%s' "$b" | cut -d. -f2)"
  b3="$(printf '%s' "$b" | cut -d. -f3)"
  a1="${a1:-0}"; a2="${a2:-0}"; a3="${a3:-0}"
  b1="${b1:-0}"; b2="${b2:-0}"; b3="${b3:-0}"

  for pair in "$a1 $b1" "$a2 $b2" "$a3 $b3"; do
    left="$(printf '%s' "$pair" | awk '{print $1}')"
    right="$(printf '%s' "$pair" | awk '{print $2}')"
    if [ "$left" -gt "$right" ] 2>/dev/null; then
      printf '1'
      return
    fi
    if [ "$left" -lt "$right" ] 2>/dev/null; then
      printf -- '-1'
      return
    fi
  done

  printf '0'
}

semver_upgrade_classification() {
  target="$1"
  current="$2"
  if ! semver_is_valid "$target"; then
    printf 'INVALID_VERSION'
    return
  fi
  if ! semver_is_valid "$current"; then
    printf 'INVALID_CURRENT_VERSION'
    return
  fi
  cmp="$(semver_cmp "$target" "$current")"
  case "$cmp" in
    0) printf 'SAME_VERSION' ;;
    -1) printf 'DOWNGRADE' ;;
    1) printf 'UPGRADE' ;;
    *) printf 'INVALID_VERSION' ;;
  esac
}

metadata_value() {
  name="$1"
  default="${2:-}"
  if [ ! -r "$METADATA_FILE" ]; then
    printf '%s' "$default"
    return
  fi
  value="$(grep -E "\"${name}\"[[:space:]]*:" "$METADATA_FILE" 2>/dev/null | head -n 1 | sed -E "s/.*\"${name}\"[[:space:]]*:[[:space:]]*\"([^\"]*)\".*/\1/" || true)"
  [ -n "$value" ] && printf '%s' "$value" || printf '%s' "$default"
}

version_file_value() {
  if [ ! -r "${DEPLOY_ROOT}/VERSION" ]; then
    return 1
  fi
  value="$(sed -n '1{s/[[:space:]]//g;p;q;}' "${DEPLOY_ROOT}/VERSION" 2>/dev/null || true)"
  [ -n "$value" ] || return 1
  printf '%s' "$value"
}

image_tag_version() {
  image="$1"
  [ -n "$image" ] || return 1
  case "$image" in
    *:*) printf '%s' "${image##*:}" ;;
    *) return 1 ;;
  esac
}

coherent_recovery_version() {
  candidate=""
  for source in \
    "VERSION:$(version_file_value 2>/dev/null || true)" \
    "TECHDESK_VERSION:$(env_value TECHDESK_VERSION "")" \
    "TECHDESK_API_IMAGE:$(image_tag_version "$(env_value TECHDESK_API_IMAGE "")" 2>/dev/null || true)" \
    "TECHDESK_FRONTEND_IMAGE:$(image_tag_version "$(env_value TECHDESK_FRONTEND_IMAGE "")" 2>/dev/null || true)"; do
    name="${source%%:*}"
    value="${source#*:}"
    [ -n "$value" ] || continue
    if ! semver_is_valid "$value"; then
      fail "Fonte de versao invalida em ${name}: ${value}." >&2
      return 1
    fi
    if [ -z "$candidate" ]; then
      candidate="$value"
      continue
    fi
    if [ "$candidate" != "$value" ]; then
      fail "Versoes divergentes detectadas (${candidate} != ${value}) em ${name}. Metadata nao sera reconstruida automaticamente." >&2
      return 1
    fi
  done

  if [ -z "$candidate" ]; then
    fail "Unable to determine installed TechDesk version." >&2
    return 1
  fi

  printf '%s' "$candidate"
}

current_version() {
  metadata_version="$(metadata_value version "")"
  if [ -n "$metadata_version" ]; then
    printf '%s' "$metadata_version"
    return
  fi
  file_version="$(version_file_value 2>/dev/null || true)"
  if [ -n "$file_version" ]; then
    printf '%s' "$file_version"
    return
  fi
  printf '%s' "$UNKNOWN_VERSION"
}

version_diagnostics() {
  metadata_version="$(metadata_value version "")"
  file_version="$(version_file_value 2>/dev/null || true)"

  if [ -n "$metadata_version" ] && [ -n "$file_version" ] && [ "$metadata_version" != "$file_version" ]; then
    echo "WARNING: metadata version (${metadata_version}) differs from VERSION file (${file_version})."
    return 1
  fi

  if [ -z "$metadata_version" ] && [ -n "$file_version" ]; then
    echo "WARNING: metadata ausente; usando VERSION publico como fallback read-only."
    return 1
  fi

  if [ "$(current_version)" = "$UNKNOWN_VERSION" ]; then
    echo "WARNING: Unable to determine installed TechDesk version."
    return 1
  fi

  return 0
}

write_metadata() {
  version="$1"
  last_upgrade="${2:-}"
  installation_id="$(metadata_value installationId "")"
  if [ -z "$installation_id" ]; then
    installation_id="$(hex_secret 16)"
  fi
  installed_at="$(metadata_value installedAt "$(setup_timestamp)")"
  project="$(project_name)"
  port="$(techdesk_port)"
  tmp="${METADATA_FILE}.tmp"

  {
    echo "{"
    echo "  \"installationId\": \"${installation_id}\","
    echo "  \"version\": \"${version}\","
    echo "  \"installedAt\": \"${installed_at}\","
    if [ -n "$last_upgrade" ]; then
      echo "  \"lastUpgradeAt\": \"${last_upgrade}\","
    else
      existing_last="$(metadata_value lastUpgradeAt "")"
      [ -n "$existing_last" ] && echo "  \"lastUpgradeAt\": \"${existing_last}\","
    fi
    echo "  \"projectName\": \"${project}\","
    echo "  \"frontendPort\": \"${port}\","
    echo "  \"installerVersion\": \"${INSTALLER_VERSION}\""
    echo "}"
  } > "$tmp" || return 1
  chmod 644 "$tmp" || {
    rm -f "$tmp"
    return 1
  }
  mv "$tmp" "$METADATA_FILE" || return 1
  chmod 644 "$METADATA_FILE" || return 1
  [ "$(metadata_value version "")" = "$version" ] || return 1
}

docker_available() {
  command -v docker >/dev/null 2>&1
}

docker_access_state() {
  if ! docker_available; then
    printf 'NOT_INSTALLED'
    return
  fi

  docker_info_output="$(docker info 2>&1)" && {
    printf 'RUNNING'
    return
  }

  if printf '%s' "$docker_info_output" | grep -Eqi 'permission denied|docker\.sock.*denied|access is denied'; then
    printf 'PERMISSION_DENIED'
  else
    printf 'UNAVAILABLE'
  fi
}

docker_daemon_running() {
  [ "$(docker_access_state)" = "RUNNING" ]
}

compose_available() {
  docker compose version >/dev/null 2>&1
}

container_count() {
  if ! docker_available || ! docker_daemon_running; then
    printf '0'
    return
  fi
  docker ps -a --filter "label=com.docker.compose.project=$(project_name)" --format '{{.Names}}' 2>/dev/null | wc -l | tr -d ' '
}

volume_count() {
  if ! docker_available || ! docker_daemon_running; then
    printf '0'
    return
  fi
  docker volume ls --filter "label=com.docker.compose.project=$(project_name)" --format '{{.Name}}' 2>/dev/null | wc -l | tr -d ' '
}

show_container_status() {
  docker ps -a \
    --filter "label=com.docker.compose.project=$(project_name)" \
    --format 'table {{.Name}}\t{{.Status}}' 2>/dev/null || true
}

frontend_responds() {
  curl -fsS "$(base_url)/health" >/dev/null 2>&1
}

api_ready() {
  curl -fsS "$(base_url)/api/ready" >/dev/null 2>&1
}

detect_installation_state() {
  has_env=0
  has_metadata=0
  has_compose=0
  [ -f "$ENV_FILE" ] && has_env=1
  [ -f "$METADATA_FILE" ] && has_metadata=1
  [ -f "$COMPOSE_FILE" ] && has_compose=1

  containers="$(container_count)"
  volumes="$(volume_count)"

  if [ "$has_env" -eq 0 ] && [ "$has_metadata" -eq 0 ] && [ "$containers" -eq 0 ] && [ "$volumes" -eq 0 ]; then
    printf 'NOT_INSTALLED'
    return
  fi

  if [ "$has_env" -eq 0 ] || [ "$has_compose" -eq 0 ]; then
    printf 'PARTIAL_INSTALLATION'
    return
  fi

  if [ "$has_env" -eq 1 ] && [ "$has_metadata" -eq 0 ]; then
    printf 'PARTIAL_INSTALLATION'
    return
  fi

  if [ "$volumes" -gt 0 ] && [ "$has_env" -eq 0 ]; then
    printf 'PARTIAL_INSTALLATION'
    return
  fi

  if [ "$containers" -gt 0 ] || [ "$has_metadata" -eq 1 ] || [ "$has_env" -eq 1 ]; then
    if frontend_responds && api_ready; then
      printf 'INSTALLED_HEALTHY'
    else
      printf 'INSTALLED_UNHEALTHY'
    fi
    return
  fi

  printf 'PARTIAL_INSTALLATION'
}

wait_for_ready() {
  timeout="${1:-120}"
  end=$(( $(date +%s) + timeout ))
  while [ "$(date +%s)" -lt "$end" ]; do
    if frontend_responds && api_ready; then
      return 0
    fi
    sleep 5
  done
  return 1
}

detect_ips() {
  if command -v ip >/dev/null 2>&1; then
    ip -o -4 addr show scope global 2>/dev/null |
      awk '{print $4}' |
      cut -d/ -f1 |
      grep -Ev '^(127|169\.254|172\.1[6-9]|172\.2[0-9]|172\.3[0-1])\.'
    return
  fi
  if command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.' | grep -Ev '^(127|169\.254)\.'
  fi
}

cors_origins_for_port() {
  port="$1"
  suffix=""
  [ "$port" != "80" ] && suffix=":${port}"
  origins="http://localhost${suffix},http://127.0.0.1${suffix}"
  host="$(hostname 2>/dev/null || true)"
  [ -n "$host" ] && origins="${origins},http://${host}${suffix}"
  for ip in $(detect_ips || true); do
    origins="${origins},http://${ip}${suffix}"
  done
  printf '%s' "$origins"
}

show_urls() {
  port="$(techdesk_port)"
  suffix=""
  [ "$port" != "80" ] && suffix=":${port}"
  echo "Local:"
  echo "  http://localhost${suffix}"
  ips="$(detect_ips || true)"
  if [ -n "$ips" ]; then
    echo "Rede:"
    for ip in $ips; do
      echo "  http://${ip}${suffix}"
    done
  else
    echo "Rede: nenhum IP de LAN plausivel detectado."
  fi
}

check_firewall_warning() {
  port="$1"
  if command -v ufw >/dev/null 2>&1; then
    status="$(ufw status 2>/dev/null || true)"
    if printf '%s' "$status" | grep -qi '^Status: active' && ! printf '%s' "$status" | grep -Eq "(^|[[:space:]])${port}(/tcp)?"; then
      echo "WARNING: UFW ativo e a porta ${port} nao parece liberada."
      echo "Comando sugerido: sudo ufw allow ${port}/tcp"
      log_line "WARNING UFW active and port not listed"
    fi
  fi
}

preflight() {
  mode="${1:-install}"
  port="${2:-$(techdesk_port)}"
  failures=0

  say "[1/8] Verificando ambiente..."

  os="$(uname -s 2>/dev/null || printf unknown)"
  case "$os" in
    Linux) say "PASS: SO Linux detectado." ;;
    *) say "WARNING: Plataforma ${os}; producao oficial e Ubuntu Server LTS com Docker Engine." ;;
  esac

  arch="$(uname -m 2>/dev/null || printf unknown)"
  case "$arch" in
    x86_64|amd64|aarch64|arm64) say "PASS: arquitetura ${arch}." ;;
    *) say "WARNING: arquitetura ${arch} nao validada oficialmente." ;;
  esac

  cpu_count="$(getconf _NPROCESSORS_ONLN 2>/dev/null || printf 1)"
  [ "$cpu_count" -lt 2 ] 2>/dev/null && say "WARNING: CPU abaixo da recomendacao." || say "PASS: CPU OK."

  if command -v awk >/dev/null 2>&1 && [ -r /proc/meminfo ]; then
    mem_kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
    [ "$mem_kb" -lt 2097152 ] 2>/dev/null && say "WARNING: RAM abaixo de 2 GB." || say "PASS: RAM OK."
  else
    say "WARNING: nao foi possivel medir RAM."
  fi

  free_kb="$(df -Pk "$DEPLOY_ROOT" | awk 'NR==2 {print $4}')"
  if [ "$free_kb" -lt 5242880 ] 2>/dev/null; then
    say "FAIL: espaco livre menor que 5 GB."
    failures=$((failures + 1))
  else
    say "PASS: espaco livre OK."
  fi

  if ! validate_port "$port"; then
    say "FAIL: porta invalida: ${port}."
    failures=$((failures + 1))
  elif [ "$mode" = "install" ] && port_in_use "$port"; then
    say "FAIL: porta ${port} ja esta em uso."
    failures=$((failures + 1))
  else
    say "PASS: porta ${port} disponivel/valida."
  fi

  if ! docker_available; then
    say "FAIL: Docker nao encontrado. Instale Docker Engine e Docker Compose Plugin pelo procedimento oficial do Docker para Ubuntu."
    failures=$((failures + 1))
  elif ! docker_daemon_running; then
    say "FAIL: Docker instalado, mas daemon nao esta rodando."
    failures=$((failures + 1))
  elif ! compose_available; then
    say "FAIL: Docker Compose Plugin indisponivel."
    failures=$((failures + 1))
  else
    docker --version 2>&1 | redact >> "$SETUP_LOG_FILE" || true
    docker compose version 2>&1 | redact >> "$SETUP_LOG_FILE" || true
    say "PASS: Docker e Compose OK."
  fi

  check_firewall_warning "$port"

  [ "$failures" -eq 0 ]
}

write_env_file() {
  port="$1"
  admin_name="$2"
  admin_login="$3"
  admin_password="$4"
  target_version="$5"
  project="${6:-$DEFAULT_PROJECT_NAME}"

  if [ -f "$ENV_FILE" ]; then
    fail ".env existente detectado. Nao sobrescrevendo configuracao."
    return 1
  fi

  postgres_password="$(hex_secret 32)"
  jwt_secret="$(hex_secret 64)"
  db_name="techdesk"
  db_user="techdesk"
  database_url="postgresql://${db_user}:${postgres_password}@postgres:5432/${db_name}?schema=public"
  origins="$(cors_origins_for_port "$port")"
  tmp="${ENV_FILE}.tmp"

  {
    echo "TECHDESK_PORT=${port}"
    echo "TECHDESK_PROJECT_NAME=${project}"
    echo "TECHDESK_VERSION=${target_version}"
    echo ""
    echo "POSTGRES_DB=${db_name}"
    echo "POSTGRES_USER=${db_user}"
    echo "POSTGRES_PASSWORD=${postgres_password}"
    echo ""
    echo "DATABASE_URL=${database_url}"
    echo ""
    echo "JWT_SECRET=${jwt_secret}"
    echo "JWT_EXPIRES_IN=8h"
    echo ""
    echo "CORS_ORIGIN=${origins}"
    echo "SWAGGER_ENABLED=false"
    echo "LOG_LEVEL=info"
    echo ""
    echo "ADMIN_NAME=${admin_name}"
    echo "ADMIN_LOGIN=${admin_login}"
    echo "ADMIN_PASSWORD=${admin_password}"
    echo ""
    echo "TECHDESK_API_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-api:${target_version}"
    echo "TECHDESK_FRONTEND_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-frontend:${target_version}"
  } > "$tmp"
  chmod 600 "$tmp" 2>/dev/null || true
  mv "$tmp" "$ENV_FILE"
}

replace_env_value() {
  key="$1"
  value="$2"
  tmp="${ENV_FILE}.tmp"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -E "s#^${key}=.*#${key}=${value}#" "$ENV_FILE" > "$tmp"
  else
    cp "$ENV_FILE" "$tmp"
    printf '%s=%s\n' "$key" "$value" >> "$tmp"
  fi
  chmod 600 "$tmp" 2>/dev/null || true
  mv "$tmp" "$ENV_FILE"
}

apply_target_images() {
  version="$1"
  replace_env_value TECHDESK_VERSION "$version"
  replace_env_value TECHDESK_API_IMAGE "ghcr.io/welissonhrq21/techdesk-pro-api:${version}"
  replace_env_value TECHDESK_FRONTEND_IMAGE "ghcr.io/welissonhrq21/techdesk-pro-frontend:${version}"
}

ensure_env_permissions() {
  [ -f "$ENV_FILE" ] && chmod 600 "$ENV_FILE" 2>/dev/null || true
  [ -f "$METADATA_FILE" ] && chmod 644 "$METADATA_FILE" 2>/dev/null || true
  [ -f "${DEPLOY_ROOT}/VERSION" ] && chmod 644 "${DEPLOY_ROOT}/VERSION" 2>/dev/null || true
  [ -d "$LOG_DIR" ] && chmod 700 "$LOG_DIR" 2>/dev/null || true
  [ -d "$BACKUP_DIR" ] && chmod 700 "$BACKUP_DIR" 2>/dev/null || true
}

self_test_setup_core() {
  [ "$(semver_cmp 1.10.0 1.9.0)" = "1" ] || return 1
  [ "$(semver_cmp 1.0.0 1.1.0)" = "-1" ] || return 1
  [ "$(semver_cmp v1.1.0 1.1.0)" = "0" ] || return 1
  [ "$(semver_upgrade_classification invalid 1.0.0)" = "INVALID_VERSION" ] || return 1
  [ "$(semver_upgrade_classification 1 1.0.0)" = "INVALID_VERSION" ] || return 1
  [ "$(semver_upgrade_classification 1.0 1.0.0)" = "INVALID_VERSION" ] || return 1
  [ "$(semver_upgrade_classification abc 1.0.0)" = "INVALID_VERSION" ] || return 1
  [ "$(semver_upgrade_classification 1.0.0 1.0.0)" = "SAME_VERSION" ] || return 1
  [ "$(semver_upgrade_classification 1.1.0 1.0.0)" = "UPGRADE" ] || return 1
  [ "$(semver_upgrade_classification 1.1.1-rc.1 1.1.0)" = "UPGRADE" ] || return 1
  [ "$(semver_upgrade_classification 1.10.0 1.0.0)" = "UPGRADE" ] || return 1
  [ "$(semver_upgrade_classification 0.9.0 1.0.0)" = "DOWNGRADE" ] || return 1
  validate_port 8080 || return 1
  ! validate_port 70000 || return 1
  secret_suffix="STAGE501"
  admin_secret="TEST_ADMIN_PASSWORD_${secret_suffix}"
  jwt_secret="TEST_JWT_SECRET_${secret_suffix}_ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  postgres_secret="TEST_POSTGRES_PASSWORD_${secret_suffix}"
  redacted="$(
    cat <<EOF | redact
ADMIN_PASSWORD=${admin_secret}
ADMIN_PASSWORD: ${admin_secret}
"ADMIN_PASSWORD": "${admin_secret}"
'ADMIN_PASSWORD': '${admin_secret}'
JWT_SECRET=${jwt_secret}
JWT_SECRET: ${jwt_secret}
"JWT_SECRET": "${jwt_secret}"
POSTGRES_PASSWORD=${postgres_secret}
POSTGRES_PASSWORD: ${postgres_secret}
"POSTGRES_PASSWORD": "${postgres_secret}"
DATABASE_URL=postgresql://postgres:${postgres_secret}@postgres:5432/techdesk
DATABASE_URL: postgresql://postgres:${postgres_secret}@postgres:5432/techdesk
postgres://postgres:${postgres_secret}@postgres:5432/techdesk
https://user:${postgres_secret}@example.test/path
Authorization: Bearer ${jwt_secret}
Bearer ${jwt_secret}
publicToken: abc123
EOF
  )"
  printf '%s' "$redacted" | grep -q '\[REDACTED\]' || return 1
  ! printf '%s' "$redacted" | grep -q "$admin_secret" || return 1
  ! printf '%s' "$redacted" | grep -q "$jwt_secret" || return 1
  ! printf '%s' "$redacted" | grep -q "$postgres_secret" || return 1
  ! printf '%s' "$redacted" | grep -q "Bearer ${jwt_secret}" || return 1
}
