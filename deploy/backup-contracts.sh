#!/bin/sh
set -eu

# Structured backup operations. Browser-controlled values are limited to a
# sha256 backup ID; filesystem paths and command selection remain internal.

contract_backup_id_digest() {
  contract_id="$1"
  case "$contract_id" in
    sha256:[a-f0-9][a-f0-9]*) ;;
    *) return 1 ;;
  esac
  contract_digest="${contract_id#sha256:}"
  [ "${#contract_digest}" -eq 64 ] || return 1
  case "$contract_digest" in *[!a-f0-9]*) return 1 ;; esac
}

contract_backup_name_valid() {
  case "$1" in
    backup-inicial-producao-[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9][0-9]-[0-9][0-9]-[0-9][0-9].dump) ;;
    *) return 1 ;;
  esac
  case "$1" in *[!A-Za-z0-9._-]*) return 1 ;; esac
}

contract_backup_error() {
  error_command="$1"
  error_code="$2"
  error_message="$3"
  error_data="$4"
  contract_emit "$error_command" false FAIL "$error_code" "$error_data" '[]' \
    "[{\"code\":\"${error_code}\",\"message\":\"${error_message}\"}]"
}

contract_backup_access_ready() {
  [ -r "$ENV_FILE" ] && [ -d "$BACKUP_DIR" ] && [ ! -L "$BACKUP_DIR" ] && \
    [ -r "$BACKUP_DIR" ] && [ -w "$BACKUP_DIR" ] && [ -d "$LOG_DIR" ] && [ -w "$LOG_DIR" ]
}

contract_metadata_write() {
  metadata_sha="$1"
  metadata_name="$2"
  metadata_size="$3"
  metadata_state="$4"
  metadata_code="$5"
  metadata_checked="$(contract_timestamp)"
  metadata_directory="${BACKUP_DIR}/.metadata"
  [ ! -L "$metadata_directory" ] || return 1
  mkdir -p "$metadata_directory" || return 1
  chmod 700 "$metadata_directory" || return 1
  metadata_temp="${metadata_directory}/.${metadata_sha}.$$.tmp"
  metadata_final="${metadata_directory}/${metadata_sha}.meta"
  [ ! -e "$metadata_temp" ] && [ ! -L "$metadata_temp" ] || return 1
  umask 077
  printf '1|%s|%s|%s|%s|%s|%s\n' \
    "$metadata_sha" "$metadata_name" "$metadata_size" "$metadata_checked" "$metadata_state" "$metadata_code" > "$metadata_temp" || return 1
  chmod 600 "$metadata_temp" || { rm -f "$metadata_temp"; return 1; }
  if sync -f "$metadata_temp" 2>/dev/null; then :; else sync "$metadata_temp" || { rm -f "$metadata_temp"; return 1; }; fi
  mv "$metadata_temp" "$metadata_final" || { rm -f "$metadata_temp"; return 1; }
  if sync -f "$metadata_directory" 2>/dev/null; then :; else sync; fi
}

contract_resolve_backup() {
  resolve_digest="$1"
  CONTRACT_BACKUP_FILE=""
  CONTRACT_BACKUP_NAME=""
  CONTRACT_BACKUP_SHA="$resolve_digest"
  CONTRACT_BACKUP_SIZE=""
  CONTRACT_BACKUP_CREATED=""
  CONTRACT_BACKUP_IDENTITY=""
  [ -d "$BACKUP_DIR" ] && [ ! -L "$BACKUP_DIR" ] && [ -r "$BACKUP_DIR" ] || return 4

  metadata_file="${BACKUP_DIR}/.metadata/${resolve_digest}.meta"
  preferred_name=""
  if [ -f "$metadata_file" ] && [ ! -L "$metadata_file" ]; then
    metadata_line="$(sed -n '1p' "$metadata_file" 2>/dev/null || true)"
    old_ifs="$IFS"; IFS='|'; set -- $metadata_line; IFS="$old_ifs"
    if [ "$#" -eq 7 ] && [ "$1" = "1" ] && [ "$2" = "$resolve_digest" ] && contract_backup_name_valid "$3"; then
      preferred_name="$3"
    fi
  fi

  if [ -n "$preferred_name" ]; then
    candidate="${BACKUP_DIR}/${preferred_name}"
    [ -f "$candidate" ] && [ ! -L "$candidate" ] || return 3
    current_sha="$(contract_sha256 "$candidate" || true)"
    [ "$current_sha" = "$resolve_digest" ] || return 2
    CONTRACT_BACKUP_FILE="$candidate"
    CONTRACT_BACKUP_NAME="$preferred_name"
  else
    candidates="$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type f -name 'backup-inicial-producao-*.dump' -printf '%f\n' 2>/dev/null || true)"
    while IFS= read -r candidate_name; do
      [ -n "$candidate_name" ] || continue
      contract_backup_name_valid "$candidate_name" || continue
      candidate="${BACKUP_DIR}/${candidate_name}"
      [ -f "$candidate" ] && [ ! -L "$candidate" ] || continue
      current_sha="$(contract_sha256 "$candidate" || true)"
      if [ "$current_sha" = "$resolve_digest" ]; then
        CONTRACT_BACKUP_FILE="$candidate"
        CONTRACT_BACKUP_NAME="$candidate_name"
        break
      fi
    done <<EOF
${candidates}
EOF
    [ -n "$CONTRACT_BACKUP_FILE" ] || return 3
  fi

  CONTRACT_BACKUP_IDENTITY="$(stat -c '%d:%i:%s' "$CONTRACT_BACKUP_FILE" 2>/dev/null || true)"
  CONTRACT_BACKUP_SIZE="$(stat -c %s "$CONTRACT_BACKUP_FILE" 2>/dev/null || true)"
  backup_epoch="$(stat -c %Y "$CONTRACT_BACKUP_FILE" 2>/dev/null || true)"
  case "${CONTRACT_BACKUP_IDENTITY}:${CONTRACT_BACKUP_SIZE}:${backup_epoch}" in *[!0-9:]*) return 4 ;; esac
  CONTRACT_BACKUP_CREATED="$(date -u -d "@${backup_epoch}" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || true)"
  case "$CONTRACT_BACKUP_CREATED" in ????-??-??T??:??:??Z) ;; *) return 4 ;; esac
}

contract_backup_revalidate() {
  [ -f "$CONTRACT_BACKUP_FILE" ] && [ ! -L "$CONTRACT_BACKUP_FILE" ] || return 1
  [ "$(stat -c '%d:%i:%s' "$CONTRACT_BACKUP_FILE" 2>/dev/null || true)" = "$CONTRACT_BACKUP_IDENTITY" ] || return 1
  [ "$(contract_sha256 "$CONTRACT_BACKUP_FILE" || true)" = "$CONTRACT_BACKUP_SHA" ] || return 1
}

contract_verify_backup_format() {
  command -v docker >/dev/null 2>&1 || return 50
  docker compose version >/dev/null 2>&1 || return 50
  docker info >/dev/null 2>&1 || return 50
  if ! docker run --rm -v "${BACKUP_DIR}:/backups:ro" postgres:16 pg_restore -l "/backups/${CONTRACT_BACKUP_NAME}" >/dev/null 2>&1; then
    return 51
  fi
  contract_backup_revalidate || return 52
}

contract_backup_json() {
  validation_json="$(contract_backup_validation_json "$CONTRACT_BACKUP_SHA" "$CONTRACT_BACKUP_NAME" "$CONTRACT_BACKUP_SIZE")"
  printf '{"backupId":"sha256:%s","displayName":"%s","createdAt":"%s","sizeBytes":%s,"sha256":"%s","validation":%s}' \
    "$CONTRACT_BACKUP_SHA" "$CONTRACT_BACKUP_NAME" "$CONTRACT_BACKUP_CREATED" "$CONTRACT_BACKUP_SIZE" "$CONTRACT_BACKUP_SHA" "$validation_json"
}

contract_resolve_or_error() {
  resolve_command="$1"
  resolve_id="$2"
  resolve_data="$3"
  if ! contract_backup_id_digest "$resolve_id"; then
    contract_backup_error "$resolve_command" BACKUP_ID_INVALID "The backup identifier is invalid." "$resolve_data"
    return 1
  fi
  resolve_status=0
  contract_resolve_backup "$contract_digest" || resolve_status="$?"
  case "$resolve_status" in
    0) return 0 ;;
    2) contract_backup_error "$resolve_command" BACKUP_CHECKSUM_MISMATCH "The canonical backup checksum does not match its identifier." "$resolve_data" ;;
    3) contract_backup_error "$resolve_command" BACKUP_NOT_FOUND "The canonical backup was not found." "$resolve_data" ;;
    *) contract_backup_error "$resolve_command" BACKUP_ROOT_UNSAFE "The canonical backup root is unavailable or unsafe." "$resolve_data" ;;
  esac
  return 1
}

contract_backup_cmd() {
  contract_begin
  if ! contract_backup_access_ready; then
    contract_backup_error backup BACKUP_PERMISSION_DENIED "Backup storage is unavailable to the operational CLI." '{"backup":null}'
    return
  fi
  setup_log_init
  receipt="${LOG_DIR}/backup-receipt-$$.tmp"
  output="${LOG_DIR}/backup-output-$$.tmp"
  rm -f "$receipt" "$output"
  backup_status=0
  TECHDESK_CONTRACT_RECEIPT=1 "${DEPLOY_ROOT}/backup.sh" 3>"$receipt" >"$output" 2>&1 || backup_status="$?"
  redact < "$output" >> "$SETUP_LOG_FILE" || true
  rm -f "$output"
  if [ "$backup_status" -ne 0 ]; then
    rm -f "$receipt"
    case "$backup_status" in
      10) code=BACKUP_DISK_PREFLIGHT_UNAVAILABLE; message="Backup disk capacity could not be measured." ;;
      11) code=BACKUP_DISK_SPACE_LOW; message="Insufficient disk space for a safe backup." ;;
      20) code=BACKUP_POSTGRES_UNAVAILABLE; message="PostgreSQL is unavailable for backup." ;;
      21|22|23) code=BACKUP_CREATE_FAILED; message="The database backup could not be created." ;;
      24|30|31) code=BACKUP_VALIDATION_FAILED; message="The new backup failed validation and was not finalized." ;;
      *) code=BACKUP_FAILED; message="The backup operation failed safely." ;;
    esac
    contract_backup_error backup "$code" "$message" '{"backup":null}'
    return
  fi
  old_ifs="$IFS"; IFS="$(printf '\t')"; read -r receipt_name receipt_created receipt_size receipt_sha < "$receipt" || true; IFS="$old_ifs"
  rm -f "$receipt"
  if ! contract_backup_name_valid "${receipt_name:-}" || [ "${#receipt_sha}" -ne 64 ]; then
    contract_backup_error backup BACKUP_RECEIPT_INVALID "The finalized backup receipt is invalid." '{"backup":null}'
    return
  fi
  contract_resolve_backup "$receipt_sha" || {
    contract_backup_error backup BACKUP_FINALIZATION_UNVERIFIED "The finalized backup could not be verified." '{"backup":null}'
    return
  }
  [ "$CONTRACT_BACKUP_NAME" = "$receipt_name" ] && [ "$CONTRACT_BACKUP_SIZE" = "$receipt_size" ] || {
    contract_backup_error backup BACKUP_FINALIZATION_UNVERIFIED "The finalized backup metadata is inconsistent." '{"backup":null}'
    return
  }
  warnings='[]'; result=PASS; code=BACKUP_CREATED
  if ! contract_metadata_write "$CONTRACT_BACKUP_SHA" "$CONTRACT_BACKUP_NAME" "$CONTRACT_BACKUP_SIZE" PASS BACKUP_FORMAT_VALID; then
    warnings='[{"code":"BACKUP_METADATA_NOT_RECORDED","message":"The backup is valid but its validation metadata was not persisted."}]'
    result=WARNING; code=BACKUP_CREATED_WITH_WARNING
  fi
  data="{\"cliSchema\":\"${CONTRACT_SCHEMA_VERSION}\",\"capabilities\":${CONTRACT_CAPABILITIES},\"backup\":$(contract_backup_json)}"
  contract_emit backup true "$result" "$code" "$data" "$warnings" '[]'
}

contract_backup_check_cmd() {
  contract_begin
  backup_id="$1"
  contract_resolve_or_error backup-check "$backup_id" '{"backup":null}' || return
  verify_status=0
  contract_verify_backup_format || verify_status="$?"
  case "$verify_status" in
    0) ;;
    50) contract_backup_error backup-check BACKUP_CHECK_UNAVAILABLE "The backup format checker is unavailable." '{"backup":null}'; return ;;
    51) contract_metadata_write "$CONTRACT_BACKUP_SHA" "$CONTRACT_BACKUP_NAME" "$CONTRACT_BACKUP_SIZE" FAIL BACKUP_FORMAT_INVALID || true; contract_backup_error backup-check BACKUP_FORMAT_INVALID "The backup format is invalid." '{"backup":null}'; return ;;
    *) contract_backup_error backup-check BACKUP_CHANGED_DURING_CHECK "The backup changed during validation." '{"backup":null}'; return ;;
  esac
  if ! contract_metadata_write "$CONTRACT_BACKUP_SHA" "$CONTRACT_BACKUP_NAME" "$CONTRACT_BACKUP_SIZE" PASS BACKUP_CHECK_PASSED; then
    contract_backup_error backup-check BACKUP_METADATA_WRITE_FAILED "Validation passed but its metadata could not be persisted." '{"backup":null}'
    return
  fi
  data="{\"cliSchema\":\"${CONTRACT_SCHEMA_VERSION}\",\"capabilities\":${CONTRACT_CAPABILITIES},\"backup\":$(contract_backup_json)}"
  contract_emit backup-check true PASS BACKUP_CHECK_PASSED "$data" '[]' '[]'
}

contract_restore_check_cmd() {
  contract_begin
  backup_id="$1"
  contract_resolve_or_error restore-check "$backup_id" '{"backup":null,"isolation":null}' || return
  verify_status=0
  contract_verify_backup_format || verify_status="$?"
  case "$verify_status" in
    0) ;;
    50) contract_backup_error restore-check RESTORE_CHECK_UNAVAILABLE "The restore-check prerequisites are unavailable." '{"backup":null,"isolation":null}'; return ;;
    51) contract_metadata_write "$CONTRACT_BACKUP_SHA" "$CONTRACT_BACKUP_NAME" "$CONTRACT_BACKUP_SIZE" FAIL BACKUP_FORMAT_INVALID || true; contract_backup_error restore-check BACKUP_FORMAT_INVALID "The backup format is invalid." '{"backup":null,"isolation":null}'; return ;;
    *) contract_backup_error restore-check BACKUP_CHANGED_DURING_CHECK "The backup changed during validation." '{"backup":null,"isolation":null}'; return ;;
  esac
  setup_log_init
  output="${LOG_DIR}/restore-check-output-$$.tmp"
  restore_status=0
  "${DEPLOY_ROOT}/restore-check.sh" "$CONTRACT_BACKUP_FILE" "$CONTRACT_BACKUP_SHA" >"$output" 2>&1 || restore_status="$?"
  redact < "$output" >> "$SETUP_LOG_FILE" || true
  rm -f "$output"
  if [ "$restore_status" -ne 0 ]; then
    case "$restore_status" in
      20|21|22) code=RESTORE_CHECK_TEMP_POSTGRES_FAILED; message="The isolated PostgreSQL environment could not be prepared." ;;
      23) code=RESTORE_CHECK_RESTORE_FAILED; message="The backup could not be restored in the isolated database." ;;
      30|31) code=BACKUP_FORMAT_INVALID; message="The backup failed format or checksum validation." ;;
      32) code=RESTORE_CHECK_SCHEMA_FAILED; message="The restored schema or minimum data checks failed." ;;
      41) code=RESTORE_CHECK_CLEANUP_FAILED; message="The isolated restore completed but cleanup failed." ;;
      *) code=RESTORE_CHECK_FAILED; message="The restore-check operation failed safely." ;;
    esac
    contract_metadata_write "$CONTRACT_BACKUP_SHA" "$CONTRACT_BACKUP_NAME" "$CONTRACT_BACKUP_SIZE" FAIL "$code" || true
    contract_backup_error restore-check "$code" "$message" '{"backup":null,"isolation":null}'
    return
  fi
  if ! contract_backup_revalidate; then
    contract_backup_error restore-check BACKUP_CHANGED_DURING_CHECK "The backup changed during restore-check." '{"backup":null,"isolation":null}'
    return
  fi
  if ! contract_metadata_write "$CONTRACT_BACKUP_SHA" "$CONTRACT_BACKUP_NAME" "$CONTRACT_BACKUP_SIZE" PASS RESTORE_CHECK_PASSED; then
    contract_backup_error restore-check BACKUP_METADATA_WRITE_FAILED "Restore-check passed but its metadata could not be persisted." '{"backup":null,"isolation":null}'
    return
  fi
  data="{\"cliSchema\":\"${CONTRACT_SCHEMA_VERSION}\",\"capabilities\":${CONTRACT_CAPABILITIES},\"backup\":$(contract_backup_json),\"isolation\":{\"database\":\"TEMPORARY\",\"productionDatabaseTouched\":false,\"cleanup\":\"PASS\"}}"
  contract_emit restore-check true PASS RESTORE_CHECK_PASSED "$data" '[]' '[]'
}
