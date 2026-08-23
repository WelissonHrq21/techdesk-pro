#!/bin/sh
set -eu

# Structured, read-only contracts consumed by TechDesk Manager. This file must
# never source .env, create logs, elevate privileges, or accept filesystem paths.

CONTRACT_SCHEMA_VERSION="1.0"
CONTRACT_CAPABILITIES='["status.v1","diagnostics.v1","backup-list.v1"]'
CONTRACT_BACKUP_LIMIT=50

contract_timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

contract_epoch_ms() {
  epoch_pair="$(date -u '+%s %N' 2>/dev/null || true)"
  epoch_seconds="${epoch_pair%% *}"
  epoch_nanoseconds="${epoch_pair#* }"
  case "${epoch_seconds}:${epoch_nanoseconds}" in
    *[!0-9:]*) printf '%s000' "$(date -u +%s)" ;;
    *)
      epoch_milliseconds="$(printf '%s' "$epoch_nanoseconds" | cut -c 1-3)"
      case "$epoch_milliseconds" in
        [0-9][0-9][0-9]) printf '%s%s' "$epoch_seconds" "$epoch_milliseconds" ;;
        *) printf '%s000' "$epoch_seconds" ;;
      esac
      ;;
  esac
}

contract_begin() {
  CONTRACT_STARTED_AT="$(contract_timestamp)"
  CONTRACT_STARTED_MS="$(contract_epoch_ms)"
  CONTRACT_REQUEST_ID="cli-${CONTRACT_STARTED_MS}-$$"
}

contract_finish() {
  CONTRACT_FINISHED_AT="$(contract_timestamp)"
  finished_ms="$(contract_epoch_ms)"
  CONTRACT_DURATION_MS=$((finished_ms - CONTRACT_STARTED_MS))
  [ "$CONTRACT_DURATION_MS" -ge 0 ] 2>/dev/null || CONTRACT_DURATION_MS=0
}

contract_emit() {
  emit_command="$1"
  emit_ok="$2"
  emit_result="$3"
  emit_code="$4"
  emit_data="$5"
  emit_warnings="$6"
  emit_errors="$7"
  contract_finish
  printf '{"schemaVersion":"%s","command":"%s","requestId":"%s","startedAt":"%s","finishedAt":"%s","durationMs":%s,"ok":%s,"result":"%s","code":"%s","data":%s,"warnings":%s,"errors":%s}\n' \
    "$CONTRACT_SCHEMA_VERSION" "$emit_command" "$CONTRACT_REQUEST_ID" \
    "$CONTRACT_STARTED_AT" "$CONTRACT_FINISHED_AT" "$CONTRACT_DURATION_MS" \
    "$emit_ok" "$emit_result" "$emit_code" "$emit_data" "$emit_warnings" "$emit_errors"
}

contract_semver_or_unknown() {
  candidate="$1"
  if semver_is_valid "$candidate" 2>/dev/null; then
    printf '%s' "$candidate"
  else
    printf 'UNKNOWN'
  fi
}

contract_metadata_version() {
  contract_semver_or_unknown "$(metadata_value version "")"
}

contract_file_version() {
  contract_semver_or_unknown "$(version_file_value 2>/dev/null || true)"
}

contract_version() {
  metadata_version="$(contract_metadata_version)"
  if [ "$metadata_version" != "UNKNOWN" ]; then
    printf '%s' "$metadata_version"
    return
  fi
  contract_file_version
}

contract_version_consistent() {
  metadata_version="$(contract_metadata_version)"
  file_version="$(contract_file_version)"
  [ "$metadata_version" = "UNKNOWN" ] && return 1
  [ "$file_version" = "UNKNOWN" ] && return 1
  [ "$metadata_version" = "$file_version" ]
}

contract_port() {
  port="$(metadata_value frontendPort "")"
  if validate_port "$port" 2>/dev/null; then
    printf '%s' "$port"
  else
    printf 'UNKNOWN'
  fi
}

contract_project_name() {
  project="$(metadata_value projectName "")"
  case "$project" in
    ''|*[!A-Za-z0-9_-]*) printf '%s' "$DEFAULT_PROJECT_NAME" ;;
    *) printf '%s' "$project" ;;
  esac
}

contract_installation_state() {
  has_env=0
  has_metadata=0
  [ -e "$ENV_FILE" ] && has_env=1
  [ -e "$METADATA_FILE" ] && has_metadata=1
  if [ "$has_env" -eq 0 ] && [ "$has_metadata" -eq 0 ]; then
    printf 'NOT_INSTALLED'
  elif [ "$has_env" -eq 0 ] || [ "$has_metadata" -eq 0 ]; then
    printf 'PARTIAL'
  else
    printf 'INSTALLED'
  fi
}

contract_http_state() {
  path="$1"
  port="$2"
  if [ "$port" = "UNKNOWN" ] || ! command -v curl >/dev/null 2>&1; then
    printf 'UNKNOWN'
    return
  fi
  if curl --fail --silent --show-error --max-time 3 \
    "http://127.0.0.1:${port}${path}" >/dev/null 2>&1; then
    printf 'UP'
  else
    printf 'DOWN'
  fi
}

contract_docker_state() {
  docker_access_state
}

contract_safe_version_output() {
  version_command="$1"
  version_output=""
  case "$version_command" in
    docker)
      version_output="$(docker --version 2>/dev/null | head -c 120 || true)"
      ;;
    compose)
      version_output="$(docker compose version 2>/dev/null | head -c 120 || true)"
      ;;
  esac
  case "$version_output" in
    ''|*[!A-Za-z0-9.,_+\ \(\)\/-]*) printf 'null' ;;
    *) printf '"%s"' "$version_output" ;;
  esac
}

contract_postgres_state() {
  api_state="$1"
  docker_state="$2"
  if [ "$api_state" = "UP" ]; then
    # /api/ready executes a database query, so this is direct readiness evidence.
    printf 'HEALTHY'
    return
  fi
  if [ "$docker_state" != "RUNNING" ]; then
    printf 'UNAVAILABLE'
    return
  fi
  postgres_status="$(docker ps \
    --filter "label=com.docker.compose.project=$(contract_project_name)" \
    --filter 'label=com.docker.compose.service=postgres' \
    --format '{{.Status}}' 2>/dev/null | head -n 1 || true)"
  case "$postgres_status" in
    *'(healthy)'*) printf 'HEALTHY' ;;
    *'(unhealthy)'*|Exited*) printf 'DOWN' ;;
    '') printf 'UNKNOWN' ;;
    *) printf 'UNKNOWN' ;;
  esac
}

contract_uptime_seconds() {
  if [ -r /proc/uptime ]; then
    awk '{ printf "%d", $1 }' /proc/uptime 2>/dev/null || printf 'null'
  else
    printf 'null'
  fi
}

contract_disk_json() {
  disk_metrics="$(df -Pk "$DEPLOY_ROOT" 2>/dev/null | awk \
    'NR == 2 { gsub(/%/, "", $5); printf "%.0f %.0f %d", $2 * 1024, $4 * 1024, $5 }' || true)"
  set -- $disk_metrics
  if [ "$#" -eq 3 ] && [ "$1" -ge 0 ] 2>/dev/null && [ "$2" -ge 0 ] 2>/dev/null; then
    printf '{"path":"/opt/techdesk-pro","totalBytes":%s,"freeBytes":%s,"usedPercent":%s}' "$1" "$2" "$3"
  else
    printf '{"path":"/opt/techdesk-pro","totalBytes":null,"freeBytes":null,"usedPercent":null}'
  fi
}

contract_addresses_json() {
  if ! command -v ip >/dev/null 2>&1; then
    printf '[]'
    return
  fi
  ip -o -4 addr show scope global 2>/dev/null | awk '
    function allowed_interface(value) {
      return value ~ /^[A-Za-z0-9_.:-]+$/ && value !~ /^(lo|docker|veth|br-|virbr|podman|cni)/
    }
    BEGIN { printf "["; count = 0 }
    {
      split($4, parts, "/"); address = parts[1]; interface_name = $2
      if (count >= 16 || !allowed_interface(interface_name) || address !~ /^[0-9.]+$/ || address ~ /^(127\.|169\.254\.)/) next
      if (count > 0) printf ","
      printf "{\"family\":\"IPv4\",\"address\":\"%s\",\"interface\":\"%s\"}", address, interface_name
      count++
    }
    END { printf "]" }
  '
}

contract_primary_address() {
  if ! command -v ip >/dev/null 2>&1; then
    return 1
  fi
  ip -o -4 addr show scope global 2>/dev/null | awk '
    $2 ~ /^[A-Za-z0-9_.:-]+$/ && $2 !~ /^(lo|docker|veth|br-|virbr|podman|cni)/ {
      split($4, parts, "/")
      if (parts[1] ~ /^[0-9.]+$/ && parts[1] !~ /^(127\.|169\.254\.)/) { print parts[1]; exit }
    }
  '
}

contract_url_json() {
  port="$1"
  installation_state="$2"
  if [ "$port" = "UNKNOWN" ] || [ "$installation_state" = "NOT_INSTALLED" ]; then
    printf 'null'
    return
  fi
  address="$(contract_primary_address 2>/dev/null || true)"
  if [ -z "$address" ]; then
    address="$(hostname 2>/dev/null || true)"
    case "$address" in
      ''|*[!A-Za-z0-9.-]*) printf 'null'; return ;;
    esac
  fi
  if [ "$port" = "80" ]; then
    printf '"http://%s"' "$address"
  else
    printf '"http://%s:%s"' "$address" "$port"
  fi
}

contract_latest_backup_json() {
  if [ ! -d "$BACKUP_DIR" ] || [ ! -r "$BACKUP_DIR" ]; then
    printf '{"lastCreatedAt":null,"lastValidation":null}'
    return
  fi
  latest="$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type f \
    -name 'backup-inicial-producao-*.dump' -printf '%T@ %f\n' 2>/dev/null | \
    sort -rn | head -n 1 || true)"
  filename="${latest#* }"
  case "$filename" in
    backup-inicial-producao-[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9][0-9]-[0-9][0-9]-[0-9][0-9].dump) ;;
    *) printf '{"lastCreatedAt":null,"lastValidation":null}'; return ;;
  esac
  epoch="$(stat -c %Y "${BACKUP_DIR}/${filename}" 2>/dev/null || true)"
  case "$epoch" in
    ''|*[!0-9]*) printf '{"lastCreatedAt":null,"lastValidation":null}'; return ;;
  esac
  created="$(date -u -d "@${epoch}" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || true)"
  case "$created" in
    ????-??-??T??:??:??Z) printf '{"lastCreatedAt":"%s","lastValidation":null}' "$created" ;;
    *) printf '{"lastCreatedAt":null,"lastValidation":null}' ;;
  esac
}

contract_status_cmd() {
  contract_begin
  installation_state="$(contract_installation_state)"
  version="$(contract_version)"
  [ "$installation_state" = "NOT_INSTALLED" ] && version="UNKNOWN"
  port="$(contract_port)"
  docker_state="$(contract_docker_state)"
  if compose_available; then compose_state="AVAILABLE"; else compose_state="UNAVAILABLE"; fi
  frontend_probe="$(contract_http_state /health "$port")"
  api_probe="$(contract_http_state /api/ready "$port")"
  postgres_state="$(contract_postgres_state "$api_probe" "$docker_state")"

  case "$frontend_probe" in UP) frontend_state="HEALTHY" ;; DOWN) frontend_state="DOWN" ;; *) frontend_state="UNKNOWN" ;; esac
  case "$api_probe" in UP) api_state="READY" ;; DOWN) api_state="DOWN" ;; *) api_state="UNKNOWN" ;; esac

  result="WARNING"
  code="STATUS_DEGRADED"
  overall="UNKNOWN"
  if [ "$installation_state" = "NOT_INSTALLED" ]; then
    overall="NOT_INSTALLED"; code="STATUS_NOT_INSTALLED"
  elif [ "$installation_state" = "PARTIAL" ]; then
    overall="PARTIAL"; code="STATUS_PARTIAL"
  elif [ "$frontend_state" = "HEALTHY" ] && [ "$api_state" = "READY" ] && [ "$postgres_state" = "HEALTHY" ] && [ "$version" != "UNKNOWN" ]; then
    overall="HEALTHY"; result="PASS"; code="STATUS_COMPLETE"
  elif [ "$frontend_state" = "DOWN" ] && [ "$api_state" = "DOWN" ]; then
    overall="UNHEALTHY"; result="FAIL"; code="STATUS_UNHEALTHY"
  elif [ "$frontend_state" = "UNKNOWN" ] && [ "$api_state" = "UNKNOWN" ]; then
    overall="UNAVAILABLE"; code="STATUS_UNAVAILABLE"
  else
    overall="DEGRADED"
  fi

  status_warnings=""
  if ! contract_version_consistent; then
    status_warnings='{"code":"VERSION_UNVERIFIED","message":"Installed version evidence is missing, invalid, or inconsistent."}'
    [ "$overall" = "HEALTHY" ] && overall="DEGRADED"
    [ "$result" = "PASS" ] && result="WARNING"
    [ "$code" = "STATUS_COMPLETE" ] && code="STATUS_DEGRADED"
  fi
  if [ "$docker_state" != "RUNNING" ]; then
    docker_warning='{"code":"DOCKER_ACCESS_UNAVAILABLE","message":"Container evidence is unavailable to the current user."}'
    if [ -n "$status_warnings" ]; then status_warnings="${status_warnings},${docker_warning}"; else status_warnings="$docker_warning"; fi
    if [ "$result" = "PASS" ]; then result="WARNING"; code="STATUS_COMPLETE_WITH_WARNINGS"; fi
  fi
  warnings="[${status_warnings}]"

  installed=false
  [ "$installation_state" != "NOT_INSTALLED" ] && installed=true
  docker_version="$(contract_safe_version_output docker)"
  compose_version="$(contract_safe_version_output compose)"
  addresses="$(contract_addresses_json)"
  disk="$(contract_disk_json)"
  backup="$(contract_latest_backup_json)"
  url="$(contract_url_json "$port" "$installation_state")"
  uptime="$(contract_uptime_seconds)"

  data="{\"cliSchema\":\"${CONTRACT_SCHEMA_VERSION}\",\"capabilities\":${CONTRACT_CAPABILITIES},\"techdesk\":{\"installed\":${installed},\"version\":\"${version}\",\"overall\":\"${overall}\",\"frontend\":{\"state\":\"${frontend_state}\"},\"api\":{\"state\":\"${api_state}\"},\"postgres\":{\"state\":\"${postgres_state}\"},\"url\":${url}},\"server\":{\"uptimeSeconds\":${uptime},\"addresses\":${addresses},\"disk\":${disk},\"docker\":{\"state\":\"${docker_state}\",\"version\":${docker_version}},\"compose\":{\"state\":\"${compose_state}\",\"version\":${compose_version}}},\"backup\":${backup}}"
  contract_emit status true "$result" "$code" "$data" "$warnings" '[]'
}

contract_checks_begin() {
  CONTRACT_CHECKS_JSON=""
  CONTRACT_CHECKS_FAIL=0
  CONTRACT_CHECKS_WARNING=0
  CONTRACT_CHECKS_SKIPPED=0
}

contract_check_add() {
  check_category="$1"
  check_id="$2"
  check_result="$3"
  check_code="$4"
  check_summary="$5"
  check_action="$6"
  check_evidence="$7"
  check_json="{\"category\":\"${check_category}\",\"id\":\"${check_id}\",\"result\":\"${check_result}\",\"code\":\"${check_code}\",\"summary\":\"${check_summary}\",\"recommendedAction\":\"${check_action}\",\"durationMs\":0,\"evidence\":${check_evidence}}"
  if [ -n "$CONTRACT_CHECKS_JSON" ]; then
    CONTRACT_CHECKS_JSON="${CONTRACT_CHECKS_JSON},${check_json}"
  else
    CONTRACT_CHECKS_JSON="$check_json"
  fi
  case "$check_result" in
    FAIL) CONTRACT_CHECKS_FAIL=$((CONTRACT_CHECKS_FAIL + 1)) ;;
    WARNING) CONTRACT_CHECKS_WARNING=$((CONTRACT_CHECKS_WARNING + 1)) ;;
    SKIPPED) CONTRACT_CHECKS_SKIPPED=$((CONTRACT_CHECKS_SKIPPED + 1)) ;;
  esac
}

contract_safe_mode() {
  mode="$(stat -c %a "$1" 2>/dev/null || true)"
  case "$mode" in
    ''|*[!0-7]*) printf 'UNKNOWN' ;;
    *) printf '%s' "$mode" ;;
  esac
}

contract_listener_state() {
  port="$1"
  if [ "$port" = "UNKNOWN" ] || ! command -v ss >/dev/null 2>&1; then
    printf 'UNKNOWN'
    return
  fi
  if ss -ltnH 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${port}$"; then
    printf 'LISTENING'
  else
    printf 'NOT_LISTENING'
  fi
}

contract_inode_percent() {
  value="$(df -Pi "$DEPLOY_ROOT" 2>/dev/null | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }' || true)"
  case "$value" in
    ''|*[!0-9]*) printf 'null' ;;
    *) printf '%s' "$value" ;;
  esac
}

contract_diagnostics_cmd() {
  contract_begin
  contract_checks_begin
  installation_state="$(contract_installation_state)"
  version="$(contract_version)"
  metadata_version="$(contract_metadata_version)"
  file_version="$(contract_file_version)"
  port="$(contract_port)"
  docker_state="$(contract_docker_state)"
  frontend_probe="$(contract_http_state /health "$port")"
  api_probe="$(contract_http_state /api/ready "$port")"
  postgres_state="$(contract_postgres_state "$api_probe" "$docker_state")"

  contract_check_add Compatibility cli.schema PASS CLI_SCHEMA_SUPPORTED \
    "CLI schema and capabilities are available." "No action required." \
    "{\"schemaVersion\":\"${CONTRACT_SCHEMA_VERSION}\",\"capabilities\":${CONTRACT_CAPABILITIES}}"

  if [ -r "${DEPLOY_ROOT}/techdesk" ] && [ -x "${DEPLOY_ROOT}/techdesk" ]; then
    runtime_mode="$(contract_safe_mode "${DEPLOY_ROOT}/techdesk")"
    contract_check_add "TechDesk runtime" runtime.cli PASS RUNTIME_CLI_AVAILABLE \
      "The runtime CLI is readable and executable." "No action required." \
      "{\"readable\":true,\"executable\":true,\"mode\":\"${runtime_mode}\"}"
  else
    contract_check_add "TechDesk runtime" runtime.cli FAIL RUNTIME_CLI_UNAVAILABLE \
      "The runtime CLI is not readable and executable." "Verify the installed runtime files and modes." \
      '{"readable":false,"executable":false,"mode":"UNKNOWN"}'
  fi

  if [ "$installation_state" = "NOT_INSTALLED" ]; then
    contract_check_add "TechDesk runtime" installation.state SKIPPED TECHDESK_NOT_INSTALLED \
      "No installed TechDesk metadata or environment marker was found." "Install TechDesk Pro before operational diagnostics." \
      '{"installed":false}'
  elif [ "$installation_state" = "PARTIAL" ]; then
    contract_check_add "TechDesk runtime" installation.state FAIL INSTALLATION_PARTIAL \
      "Installation markers are incomplete." "Run the documented TechDesk repair procedure as an operator." \
      '{"installed":true,"partial":true}'
  else
    contract_check_add "TechDesk runtime" installation.state PASS INSTALLATION_DETECTED \
      "Installation markers are present." "No action required." \
      '{"installed":true,"partial":false}'
  fi

  if [ ! -e "$METADATA_FILE" ]; then
    contract_check_add "TechDesk runtime" metadata.file WARNING METADATA_MISSING \
      "Installation metadata is missing." "Use the documented repair procedure to validate metadata." \
      '{"exists":false,"readable":false,"versionValid":false}'
  elif [ ! -r "$METADATA_FILE" ]; then
    contract_check_add "TechDesk runtime" metadata.file FAIL METADATA_UNREADABLE \
      "Installation metadata is not readable." "Verify metadata ownership and public-safe mode." \
      '{"exists":true,"readable":false,"versionValid":false}'
  elif [ "$metadata_version" = "UNKNOWN" ]; then
    contract_check_add "TechDesk runtime" metadata.file FAIL METADATA_INVALID \
      "Installation metadata does not contain a valid version." "Validate metadata without exposing its contents." \
      '{"exists":true,"readable":true,"versionValid":false}'
  else
    metadata_mode="$(contract_safe_mode "$METADATA_FILE")"
    contract_check_add "TechDesk runtime" metadata.file PASS METADATA_VALID \
      "Installation metadata contains a valid version." "No action required." \
      "{\"exists\":true,\"readable\":true,\"versionValid\":true,\"mode\":\"${metadata_mode}\"}"
  fi

  if [ "$file_version" = "UNKNOWN" ]; then
    contract_check_add "TechDesk runtime" version.file FAIL VERSION_UNAVAILABLE \
      "The public VERSION evidence is missing or invalid." "Restore the public VERSION file from a trusted package." \
      '{"readable":false,"versionValid":false}'
  else
    version_mode="$(contract_safe_mode "${DEPLOY_ROOT}/VERSION")"
    contract_check_add "TechDesk runtime" version.file PASS VERSION_VALID \
      "The public VERSION evidence is valid." "No action required." \
      "{\"readable\":true,\"versionValid\":true,\"mode\":\"${version_mode}\"}"
  fi

  if contract_version_consistent; then
    contract_check_add Compatibility version.coherence PASS VERSION_COHERENT \
      "Metadata and public VERSION agree." "No action required." \
      "{\"version\":\"${version}\"}"
  else
    contract_check_add Compatibility version.coherence WARNING VERSION_UNVERIFIED \
      "Version evidence is missing, invalid, or inconsistent." "Review public version evidence before any future mutation." \
      "{\"version\":\"${version}\"}"
  fi

  if [ ! -e "$ENV_FILE" ]; then
    contract_check_add "TechDesk runtime" env.mode WARNING ENV_MISSING \
      "The protected environment file does not exist." "Install or repair TechDesk Pro using the documented operator flow." \
      '{"exists":false,"mode":"UNKNOWN"}'
  else
    env_mode="$(contract_safe_mode "$ENV_FILE")"
    if [ "$env_mode" = "600" ]; then
      contract_check_add "TechDesk runtime" env.mode PASS ENV_MODE_SAFE \
        "The protected environment file mode is safe." "No action required." \
        "{\"exists\":true,\"mode\":\"${env_mode}\"}"
    else
      contract_check_add "TechDesk runtime" env.mode WARNING ENV_MODE_UNVERIFIED \
        "The protected environment file mode is not the expected 600." "Verify environment-file ownership and mode without reading its contents." \
        "{\"exists\":true,\"mode\":\"${env_mode}\"}"
    fi
  fi

  case "$docker_state" in
    RUNNING)
      contract_check_add Docker docker.access PASS DOCKER_RUNNING \
        "Docker is running and accessible to the CLI user." "No action required." '{"state":"RUNNING"}'
      ;;
    PERMISSION_DENIED)
      contract_check_add Docker docker.access SKIPPED DOCKER_PERMISSION_DENIED \
        "Docker exists but container evidence is unavailable to this user." "Use the operator CLI directly for privileged container diagnostics." '{"state":"PERMISSION_DENIED"}'
      ;;
    NOT_INSTALLED)
      contract_check_add Docker docker.access FAIL DOCKER_NOT_INSTALLED \
        "Docker is not installed." "Install Docker Engine using the supported operator procedure." '{"state":"NOT_INSTALLED"}'
      ;;
    *)
      contract_check_add Docker docker.access FAIL DOCKER_UNAVAILABLE \
        "Docker is installed but unavailable." "Check the Docker service outside the Manager." '{"state":"UNAVAILABLE"}'
      ;;
  esac

  if compose_available; then
    contract_check_add Docker compose.available PASS COMPOSE_AVAILABLE \
      "Docker Compose is available." "No action required." '{"state":"AVAILABLE"}'
  else
    contract_check_add Docker compose.available FAIL COMPOSE_UNAVAILABLE \
      "Docker Compose is unavailable." "Install the supported Docker Compose plugin." '{"state":"UNAVAILABLE"}'
  fi

  case "$frontend_probe" in
    UP) contract_check_add Frontend frontend.health PASS FRONTEND_HEALTHY "Frontend health responded successfully." "No action required." '{"state":"HEALTHY"}' ;;
    DOWN) contract_check_add Frontend frontend.health FAIL FRONTEND_DOWN "Frontend health did not respond successfully." "Check the frontend through the operator CLI." '{"state":"DOWN"}' ;;
    *) contract_check_add Frontend frontend.health SKIPPED FRONTEND_UNAVAILABLE "Frontend health could not be measured." "Verify public metadata and local curl availability." '{"state":"UNKNOWN"}' ;;
  esac

  case "$api_probe" in
    UP) contract_check_add API api.ready PASS API_READY "API readiness and its database query succeeded." "No action required." '{"state":"READY"}' ;;
    DOWN) contract_check_add API api.ready FAIL API_DOWN "API readiness did not respond successfully." "Check API and database state through the operator CLI." '{"state":"DOWN"}' ;;
    *) contract_check_add API api.ready SKIPPED API_UNAVAILABLE "API readiness could not be measured." "Verify public metadata and local curl availability." '{"state":"UNKNOWN"}' ;;
  esac

  case "$postgres_state" in
    HEALTHY) contract_check_add Database postgres.health PASS POSTGRES_HEALTHY "PostgreSQL readiness has direct evidence." "No action required." '{"state":"HEALTHY"}' ;;
    DOWN) contract_check_add Database postgres.health FAIL POSTGRES_DOWN "PostgreSQL container evidence reports a failure." "Use the operator CLI for database diagnostics." '{"state":"DOWN"}' ;;
    *) contract_check_add Database postgres.health SKIPPED POSTGRES_UNAVAILABLE "PostgreSQL health evidence is unavailable." "Use the operator CLI if deeper container diagnostics are required." '{"state":"UNAVAILABLE"}' ;;
  esac

  listener="$(contract_listener_state "$port")"
  case "$listener" in
    LISTENING) contract_check_add System network.listener PASS PORT_LISTENING "The configured frontend port has a listener." "No action required." "{\"state\":\"LISTENING\",\"port\":${port}}" ;;
    NOT_LISTENING) contract_check_add System network.listener FAIL PORT_NOT_LISTENING "The configured frontend port has no listener." "Check frontend publication through the operator CLI." "{\"state\":\"NOT_LISTENING\",\"port\":${port}}" ;;
    *) contract_check_add System network.listener SKIPPED PORT_UNAVAILABLE "Listener state could not be measured." "Verify public port metadata and the ss utility." '{"state":"UNKNOWN","port":null}' ;;
  esac

  disk="$(contract_disk_json)"
  inode_percent="$(contract_inode_percent)"
  if printf '%s' "$disk" | grep -q '"totalBytes":null'; then
    contract_check_add System disk.capacity SKIPPED DISK_UNAVAILABLE "Disk capacity could not be measured." "Check the runtime filesystem outside the Manager." "{\"disk\":${disk},\"inodeUsedPercent\":${inode_percent}}"
  else
    contract_check_add System disk.capacity PASS DISK_MEASURED "Disk and inode capacity were measured." "Review capacity before it reaches operational thresholds." "{\"disk\":${disk},\"inodeUsedPercent\":${inode_percent}}"
  fi

  latest_backup="$(contract_latest_backup_json)"
  if [ ! -d "$BACKUP_DIR" ] || [ ! -r "$BACKUP_DIR" ]; then
    contract_check_add Backup backup.latest SKIPPED BACKUP_DIRECTORY_UNAVAILABLE "Backup metadata is not readable by this user." "Use the operator CLI for protected backup access." '{"lastCreatedAt":null,"lastValidation":null}'
  elif printf '%s' "$latest_backup" | grep -q '"lastCreatedAt":null'; then
    contract_check_add Backup backup.latest WARNING BACKUP_NOT_FOUND "No canonical backup was found." "Create and validate a backup through the operator CLI." "$latest_backup"
  else
    contract_check_add Backup backup.latest PASS BACKUP_FOUND "A canonical backup is available." "Validate backups according to the restore-check runbook." "$latest_backup"
  fi

  if [ -x "${DEPLOY_ROOT}/restore-check.sh" ]; then
    contract_check_add Backup backup.restore-check-capability PASS RESTORE_CHECK_AVAILABLE "Restore-check capability is installed but was not executed." "Run restore-check only through the explicit operator workflow." '{"available":true,"executed":false}'
  else
    contract_check_add Backup backup.restore-check-capability WARNING RESTORE_CHECK_UNAVAILABLE "Restore-check capability is unavailable." "Restore the runtime from a trusted package." '{"available":false,"executed":false}'
  fi

  result="PASS"
  code="DIAGNOSTICS_COMPLETE"
  if [ "$CONTRACT_CHECKS_FAIL" -gt 0 ]; then
    result="FAIL"; code="DIAGNOSTICS_FAILED"
  elif [ "$CONTRACT_CHECKS_WARNING" -gt 0 ] || [ "$CONTRACT_CHECKS_SKIPPED" -gt 0 ]; then
    result="WARNING"; code="DIAGNOSTICS_WARNINGS"
  fi
  data="{\"cliSchema\":\"${CONTRACT_SCHEMA_VERSION}\",\"capabilities\":${CONTRACT_CAPABILITIES},\"checks\":[${CONTRACT_CHECKS_JSON}]}"
  contract_emit diagnostics true "$result" "$code" "$data" '[]' '[]'
}

contract_sha256() {
  file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" 2>/dev/null | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" 2>/dev/null | awk '{print $1}'
  fi
}

contract_backup_list_cmd() {
  contract_begin
  entries=""
  returned=0
  skipped=0
  limited=false

  if [ ! -d "$BACKUP_DIR" ] || [ ! -r "$BACKUP_DIR" ]; then
    data="{\"cliSchema\":\"${CONTRACT_SCHEMA_VERSION}\",\"capabilities\":${CONTRACT_CAPABILITIES},\"backups\":[],\"returned\":0,\"limited\":false}"
    contract_emit backup-list true WARNING BACKUP_DIRECTORY_UNAVAILABLE "$data" \
      '[{"code":"BACKUP_DIRECTORY_UNAVAILABLE","message":"Protected backup metadata is unavailable to the current user."}]' '[]'
    return
  fi

  candidates="$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type f \
    -name 'backup-inicial-producao-*.dump' -printf '%T@ %f\n' 2>/dev/null | \
    sort -rn | head -n $((CONTRACT_BACKUP_LIMIT + 1)) || true)"
  while IFS=' ' read -r sort_key filename; do
    [ -n "${filename:-}" ] || continue
    if [ "$returned" -ge "$CONTRACT_BACKUP_LIMIT" ]; then
      limited=true
      break
    fi
    case "$filename" in
      backup-inicial-producao-[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9][0-9]-[0-9][0-9]-[0-9][0-9].dump) ;;
      *) skipped=$((skipped + 1)); continue ;;
    esac
    case "$filename" in
      *[!A-Za-z0-9._-]*) skipped=$((skipped + 1)); continue ;;
    esac
    backup_file="${BACKUP_DIR}/${filename}"
    if [ ! -f "$backup_file" ] || [ -L "$backup_file" ]; then
      skipped=$((skipped + 1)); continue
    fi
    size="$(stat -c %s "$backup_file" 2>/dev/null || true)"
    epoch="$(stat -c %Y "$backup_file" 2>/dev/null || true)"
    sha="$(contract_sha256 "$backup_file" || true)"
    case "$size:$epoch:$sha" in
      *[!0-9a-f:]*) skipped=$((skipped + 1)); continue ;;
    esac
    [ "${#sha}" -eq 64 ] || { skipped=$((skipped + 1)); continue; }
    created="$(date -u -d "@${epoch}" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || true)"
    case "$created" in
      ????-??-??T??:??:??Z) ;;
      *) skipped=$((skipped + 1)); continue ;;
    esac
    entry="{\"backupId\":\"sha256:${sha}\",\"displayName\":\"${filename}\",\"createdAt\":\"${created}\",\"sizeBytes\":${size},\"sha256\":\"${sha}\",\"validation\":{\"state\":\"UNKNOWN\",\"checkedAt\":null,\"code\":\"VALIDATION_NOT_RECORDED\"}}"
    if [ -n "$entries" ]; then entries="${entries},${entry}"; else entries="$entry"; fi
    returned=$((returned + 1))
  done <<EOF
${candidates}
EOF

  warnings='[]'
  result="PASS"
  code="BACKUP_LIST_COMPLETE"
  if [ "$skipped" -gt 0 ]; then
    result="WARNING"; code="BACKUP_LIST_PARTIAL"
    warnings='[{"code":"BACKUP_ENTRIES_SKIPPED","message":"One or more non-canonical backup entries were ignored."}]'
  elif [ "$returned" -eq 0 ]; then
    code="BACKUP_LIST_EMPTY"
  elif [ "$limited" = "true" ]; then
    result="WARNING"; code="BACKUP_LIST_LIMITED"
    warnings='[{"code":"BACKUP_LIST_LIMITED","message":"The backup list reached its fixed response limit."}]'
  fi
  data="{\"cliSchema\":\"${CONTRACT_SCHEMA_VERSION}\",\"capabilities\":${CONTRACT_CAPABILITIES},\"backups\":[${entries}],\"returned\":${returned},\"limited\":${limited}}"
  contract_emit backup-list true "$result" "$code" "$data" "$warnings" '[]'
}
