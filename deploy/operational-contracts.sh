#!/bin/sh
set -eu

# Structured mutation contracts. The official human restart/repair functions
# remain the only action implementation; this layer captures, redacts and
# verifies their result before emitting one JSON line.

contract_service_present() {
  printf '%s\n' "$1" | grep -Fx "$2" >/dev/null 2>&1
}

contract_health_snapshot() {
  health_port="$(contract_port)"
  health_docker="$(contract_docker_state)"
  if compose_available; then health_compose="AVAILABLE"; else health_compose="UNAVAILABLE"; fi
  health_frontend_probe="$(contract_http_state /health "$health_port")"
  health_api_probe="$(contract_http_state /api/ready "$health_port")"
  health_postgres="$(contract_postgres_state "$health_api_probe" "$health_docker")"
  health_running=""
  if [ "$health_docker" = "RUNNING" ] && [ "$health_compose" = "AVAILABLE" ]; then
    health_running="$(compose ps --services --filter status=running 2>/dev/null || true)"
  fi
  health_expected=false
  if contract_service_present "$health_running" postgres && contract_service_present "$health_running" api && contract_service_present "$health_running" frontend; then
    health_expected=true
  fi
  case "$health_frontend_probe" in UP) health_frontend="HEALTHY" ;; DOWN) health_frontend="DOWN" ;; *) health_frontend="UNKNOWN" ;; esac
  case "$health_api_probe" in UP) health_api="READY" ;; DOWN) health_api="DOWN" ;; *) health_api="UNKNOWN" ;; esac
  health_overall="DOWN"
  CONTRACT_HEALTH_PASS=0
  if [ "$health_expected" = true ] && [ "$health_frontend" = "HEALTHY" ] && [ "$health_api" = "READY" ] && [ "$health_postgres" = "HEALTHY" ]; then
    health_overall="HEALTHY"
    CONTRACT_HEALTH_PASS=1
  elif [ "$health_docker" != "RUNNING" ] || [ "$health_compose" != "AVAILABLE" ]; then
    health_overall="UNAVAILABLE"
  elif [ "$health_frontend" = "UNKNOWN" ] || [ "$health_api" = "UNKNOWN" ] || [ "$health_postgres" = "UNKNOWN" ]; then
    health_overall="UNKNOWN"
  fi
  CONTRACT_HEALTH_DOCKER="$health_docker"
  CONTRACT_HEALTH_COMPOSE="$health_compose"
  CONTRACT_HEALTH_JSON="{\"overall\":\"${health_overall}\",\"expectedContainersRunning\":${health_expected},\"frontend\":{\"state\":\"${health_frontend}\"},\"api\":{\"state\":\"${health_api}\"},\"postgres\":{\"state\":\"${health_postgres}\"}}"
}

contract_phase() {
  phase_id="$1"; phase_result="$2"; phase_code="$3"; phase_summary="$4"
  printf '{"id":"%s","result":"%s","code":"%s","summary":"%s","durationMs":0}' "$phase_id" "$phase_result" "$phase_code" "$phase_summary"
}

contract_operation_data() {
  operation_name="$1"; target_json="$2"; phases_json="$3"; before_json="$4"; after_json="$5"; health="$6"; offline_state="$7"
  printf '{"cliSchema":"%s","capabilities":%s,"operation":"%s","target":%s,"phases":%s,"before":%s,"after":%s,"health":"%s","offline":{"state":"%s"}}' \
    "$CONTRACT_SCHEMA_VERSION" "$CONTRACT_CAPABILITIES" "$operation_name" "$target_json" "$phases_json" "$before_json" "$after_json" "$health" "$offline_state"
}

contract_capture_action() {
  action_callback="$1"
  action_output="$(mktemp "${TMPDIR:-/tmp}/techdesk-operation.XXXXXX")" || return 1
  ACTION_EXIT=0
  "$action_callback" >"$action_output" 2>&1 || ACTION_EXIT=$?
  if [ -n "${SETUP_LOG_FILE:-}" ] && [ -f "$action_output" ]; then redact < "$action_output" >> "$SETUP_LOG_FILE" || true; fi
  rm -f "$action_output"
}

contract_restart_stack_cmd() {
  contract_begin
  contract_health_snapshot
  restart_before="$CONTRACT_HEALTH_JSON"
  restart_before_docker="$CONTRACT_HEALTH_DOCKER"
  restart_before_compose="$CONTRACT_HEALTH_COMPOSE"
  contract_capture_action restart_stack_run
  contract_health_snapshot
  restart_after="$CONTRACT_HEALTH_JSON"

  restart_code="RESTART_STACK_COMPLETE"
  restart_ok=true
  restart_result="PASS"
  restart_health="PASS"
  restart_phase_result="PASS"
  restart_phase_code="RESTART_EXECUTED"
  restart_phase_summary="The official stack restart completed."
  restart_precheck_result="PASS"
  restart_precheck_code="RESTART_PRECHECK_PASSED"
  if [ "$ACTION_EXIT" -ne 0 ]; then
    restart_ok=false; restart_result="FAIL"; restart_health="FAIL"; restart_phase_result="FAIL"
    if [ "$restart_before_docker" != "RUNNING" ]; then restart_code="RESTART_DOCKER_UNAVAILABLE"; else restart_code="RESTART_EXECUTION_FAILED"; fi
    if [ "$restart_before_compose" != "AVAILABLE" ]; then restart_code="RESTART_COMPOSE_UNAVAILABLE"; fi
    if [ "$ACTION_EXIT" -eq 60 ]; then restart_code="RESTART_POST_HEALTH_FAILED"; fi
    if [ "$ACTION_EXIT" -eq 11 ]; then restart_code="RESTART_PERMISSION_DENIED"; fi
    if [ "$ACTION_EXIT" -eq 12 ]; then restart_code="RESTART_RUNTIME_MISSING"; fi
    restart_phase_code="$restart_code"; restart_phase_summary="The official stack restart failed safely."
    case "$restart_code" in
      RESTART_DOCKER_UNAVAILABLE|RESTART_COMPOSE_UNAVAILABLE|RESTART_PERMISSION_DENIED|RESTART_RUNTIME_MISSING)
        restart_precheck_result="FAIL"; restart_precheck_code="$restart_code" ;;
    esac
    if [ "$restart_code" = "RESTART_POST_HEALTH_FAILED" ]; then
      restart_phase_result="PASS"; restart_phase_code="RESTART_EXECUTED"; restart_phase_summary="The official stack restart completed."
    fi
  elif [ "$CONTRACT_HEALTH_PASS" -ne 1 ]; then
    restart_ok=false; restart_result="FAIL"; restart_health="FAIL"; restart_code="RESTART_POST_HEALTH_FAILED"
  fi
  phases="[$(contract_phase PRECHECK "$restart_precheck_result" "$restart_precheck_code" "Restart prerequisites were evaluated."),$(contract_phase RESTARTING "$restart_phase_result" "$restart_phase_code" "$restart_phase_summary"),$(contract_phase WAITING_FOR_SERVICES "$([ "$restart_ok" = true ] && printf PASS || printf FAIL)" "$([ "$restart_ok" = true ] && printf SERVICES_STARTED || printf SERVICES_NOT_READY)" "Service readiness was checked."),$(contract_phase VERIFYING_HEALTH "$([ "$CONTRACT_HEALTH_PASS" -eq 1 ] && printf PASS || printf FAIL)" "$([ "$CONTRACT_HEALTH_PASS" -eq 1 ] && printf POST_HEALTH_PASSED || printf POST_HEALTH_FAILED)" "Post-action health was verified."),$(contract_phase COMPLETE "$restart_result" "$restart_code" "Restart processing finished.")]"
  data="$(contract_operation_data RESTART_STACK '"stack"' "$phases" "$restart_before" "$restart_after" "$restart_health" SUPPORTED)"
  contract_emit restart "$restart_ok" "$restart_result" "$restart_code" "$data" '[]' "$([ "$restart_ok" = true ] && printf '[]' || printf '[{"code":"%s","message":"The stack restart did not complete with healthy services."}]' "$restart_code")"
}

contract_repair_cmd() {
  contract_begin
  contract_health_snapshot
  repair_before="$CONTRACT_HEALTH_JSON"
  repair_before_docker="$CONTRACT_HEALTH_DOCKER"
  repair_before_compose="$CONTRACT_HEALTH_COMPOSE"
  contract_capture_action repair_run
  contract_health_snapshot
  repair_after="$CONTRACT_HEALTH_JSON"

  repair_code="REPAIR_COMPLETE"; repair_ok=true; repair_result="PASS"; repair_health="PASS"
  repair_phase_result="PASS"; repair_phase_code="REPAIR_EXECUTED"; repair_phase_summary="The official repair procedure completed."
  repair_precheck_result="PASS"; repair_precheck_code="REPAIR_PRECHECK_PASSED"
  if [ "$ACTION_EXIT" -ne 0 ]; then
    repair_ok=false; repair_result="FAIL"; repair_health="FAIL"; repair_phase_result="FAIL"
    case "$ACTION_EXIT" in
      10) repair_code="REPAIR_PREFLIGHT_FAILED" ;;
      11) repair_code="REPAIR_PERMISSION_DENIED" ;;
      12|13) repair_code="REPAIR_RUNTIME_MISSING" ;;
      20) repair_code="REPAIR_IMAGE_PULL_FAILED" ;;
      30) repair_code="REPAIR_RUNTIME_START_FAILED" ;;
      60) repair_code="REPAIR_POST_HEALTH_FAILED" ;;
      90) repair_code="REPAIR_METADATA_FAILED" ;;
      *) repair_code="REPAIR_EXECUTION_FAILED" ;;
    esac
    [ "$repair_before_docker" = "RUNNING" ] || repair_code="REPAIR_DOCKER_UNAVAILABLE"
    [ "$repair_before_compose" = "AVAILABLE" ] || repair_code="REPAIR_COMPOSE_UNAVAILABLE"
    repair_phase_code="$repair_code"; repair_phase_summary="The official repair procedure failed safely."
    case "$repair_code" in
      REPAIR_PREFLIGHT_FAILED|REPAIR_PERMISSION_DENIED|REPAIR_RUNTIME_MISSING|REPAIR_DOCKER_UNAVAILABLE|REPAIR_COMPOSE_UNAVAILABLE)
        repair_precheck_result="FAIL"; repair_precheck_code="$repair_code" ;;
    esac
    if [ "$repair_code" = "REPAIR_POST_HEALTH_FAILED" ]; then
      repair_phase_result="PASS"; repair_phase_code="REPAIR_EXECUTED"; repair_phase_summary="The official repair procedure completed."
    fi
  elif [ "$CONTRACT_HEALTH_PASS" -ne 1 ]; then
    repair_ok=false; repair_result="FAIL"; repair_health="FAIL"; repair_code="REPAIR_POST_HEALTH_FAILED"
  fi
  phases="[$(contract_phase PRECHECK "$repair_precheck_result" "$repair_precheck_code" "Repair prerequisites were evaluated."),$(contract_phase REPAIRING "$repair_phase_result" "$repair_phase_code" "$repair_phase_summary"),$(contract_phase VERIFYING_RUNTIME "$([ "$repair_ok" = true ] && printf PASS || printf FAIL)" "$([ "$repair_ok" = true ] && printf RUNTIME_VERIFIED || printf RUNTIME_UNVERIFIED)" "Runtime state was verified."),$(contract_phase VERIFYING_HEALTH "$([ "$CONTRACT_HEALTH_PASS" -eq 1 ] && printf PASS || printf FAIL)" "$([ "$CONTRACT_HEALTH_PASS" -eq 1 ] && printf POST_HEALTH_PASSED || printf POST_HEALTH_FAILED)" "Post-action health was verified."),$(contract_phase COMPLETE "$repair_result" "$repair_code" "Repair processing finished.")]"
  data="$(contract_operation_data REPAIR null "$phases" "$repair_before" "$repair_after" "$repair_health" NETWORK_REQUIRED)"
  warnings='[{"code":"REPAIR_NETWORK_DEPENDENCY","message":"The official repair procedure may require registry access during image pull."}]'
  errors="$([ "$repair_ok" = true ] && printf '[]' || printf '[{"code":"%s","message":"Repair did not complete with healthy services."}]' "$repair_code")"
  contract_emit repair "$repair_ok" "$repair_result" "$repair_code" "$data" "$warnings" "$errors"
}
