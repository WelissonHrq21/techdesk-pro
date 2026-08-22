#!/usr/bin/env bash

set -Eeuo pipefail

readonly DIGEST_PATTERN='^sha256:[0-9a-f]{64}$'
readonly FINAL_VERSION_PATTERN='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
readonly LAB_VERSION_PATTERN='^0\.0\.0-pipeline-test-[0-9a-f]{7,40}$'

require_value() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Required environment variable is missing: ${name}" >&2
    exit 1
  fi
}

for name in VERSION RELEASE_COMMIT API_DIGEST FRONTEND_DIGEST REGISTRY_OWNER EXPECTED_SOURCE; do
  require_value "$name"
done

DRY_RUN="${DRY_RUN:-true}"
LAB_MODE="${LAB_MODE:-false}"

if [[ "$DRY_RUN" != "true" && "$DRY_RUN" != "false" ]]; then
  echo "DRY_RUN must be true or false." >&2
  exit 1
fi

if [[ "$LAB_MODE" == "true" ]]; then
  if [[ ! "$VERSION" =~ $LAB_VERSION_PATTERN ]]; then
    echo "LAB_MODE requires a 0.0.0-pipeline-test-<sha> version." >&2
    exit 1
  fi
elif [[ ! "$VERSION" =~ $FINAL_VERSION_PATTERN ]]; then
  echo "VERSION must be a final SemVer without a v prefix or prerelease suffix." >&2
  exit 1
fi

if [[ ! "$RELEASE_COMMIT" =~ ^[0-9a-f]{40}$ ]]; then
  echo "RELEASE_COMMIT must be a full lowercase 40-character commit SHA." >&2
  exit 1
fi

for digest in "$API_DIGEST" "$FRONTEND_DIGEST"; do
  if [[ ! "$digest" =~ $DIGEST_PATTERN ]]; then
    echo "Image digests must use the exact sha256:<64 lowercase hex> format." >&2
    exit 1
  fi
done

owner="$(printf '%s' "$REGISTRY_OWNER" | tr '[:upper:]' '[:lower:]')"
readonly API_IMAGE="ghcr.io/${owner}/techdesk-pro-api"
readonly FRONTEND_IMAGE="ghcr.io/${owner}/techdesk-pro-frontend"

validate_source_manifest() {
  local image="$1"
  local digest="$2"
  local ref="${image}@${digest}"
  local actual_digest
  local platforms
  local revision
  local source

  if ! actual_digest="$(docker buildx imagetools inspect "$ref" --format '{{.Manifest.Digest}}' 2>&1)"; then
    echo "Approved digest does not exist in the expected repository: ${ref}" >&2
    echo "$actual_digest" >&2
    exit 1
  fi

  if [[ "$actual_digest" != "$digest" ]]; then
    echo "Registry returned an unexpected digest for ${ref}." >&2
    exit 1
  fi

  platforms="$(docker buildx imagetools inspect "$ref" --format '{{range .Manifest.Manifests}}{{println .Platform.OS .Platform.Architecture}}{{end}}')"
  if ! grep -qx 'linux amd64' <<< "$platforms"; then
    echo "Approved manifest must contain the linux/amd64 platform: ${ref}" >&2
    exit 1
  fi

  if [[ "$LAB_MODE" != "true" ]]; then
    revision="$(docker buildx imagetools inspect "$ref" --format '{{index .Image.Config.Labels "org.opencontainers.image.revision"}}')"
    source="$(docker buildx imagetools inspect "$ref" --format '{{index .Image.Config.Labels "org.opencontainers.image.source"}}')"

    if [[ "$revision" != "$RELEASE_COMMIT" ]]; then
      echo "Image revision label does not match RELEASE_COMMIT: ${ref}" >&2
      exit 1
    fi

    if [[ "$source" != "$EXPECTED_SOURCE" ]]; then
      echo "Image source label does not match the expected repository: ${ref}" >&2
      exit 1
    fi
  fi
}

inspect_target_tag() {
  local image="$1"
  local tag="$2"
  local expected_digest="$3"
  local ref="${image}:${tag}"
  local output

  if output="$(docker buildx imagetools inspect "$ref" --format '{{.Manifest.Digest}}' 2>&1)"; then
    if [[ "$output" != "$expected_digest" ]]; then
      echo "Final image tag already exists with a different digest: ${ref}" >&2
      echo "Expected: ${expected_digest}" >&2
      echo "Existing: ${output}" >&2
      return 10
    fi

    echo "same"
    return 0
  fi

  if grep -Eqi 'not found|manifest unknown' <<< "$output"; then
    echo "missing"
    return 0
  fi

  echo "Unable to inspect target tag safely: ${ref}" >&2
  echo "$output" >&2
  return 11
}

promote_missing_tag() {
  local image="$1"
  local tag="$2"
  local digest="$3"
  local state="$4"

  if [[ "$state" == "missing" ]]; then
    docker buildx imagetools create --tag "${image}:${tag}" "${image}@${digest}"
  else
    echo "Tag already points to the approved digest: ${image}:${tag}"
  fi
}

verify_final_tag() {
  local image="$1"
  local tag="$2"
  local expected_digest="$3"
  local actual_digest

  actual_digest="$(docker buildx imagetools inspect "${image}:${tag}" --format '{{.Manifest.Digest}}')"
  if [[ "$actual_digest" != "$expected_digest" ]]; then
    echo "Final tag verification failed: ${image}:${tag}" >&2
    exit 1
  fi
}

write_summary() {
  local result="$1"

  if [[ -z "${GITHUB_STEP_SUMMARY:-}" ]]; then
    return
  fi

  {
    echo "## Image promotion"
    echo
    echo "- Result: ${result}"
    echo "- Version: \`$VERSION\`"
    echo "- Release commit: \`$RELEASE_COMMIT\`"
    echo "- API: \`$API_IMAGE@$API_DIGEST\`"
    echo "- Frontend: \`$FRONTEND_IMAGE@$FRONTEND_DIGEST\`"
    echo "- Rebuild: no"
  } >> "$GITHUB_STEP_SUMMARY"
}

echo "Validating approved source manifests."
validate_source_manifest "$API_IMAGE" "$API_DIGEST"
validate_source_manifest "$FRONTEND_IMAGE" "$FRONTEND_DIGEST"

echo "Running preflight for all final tags before any registry write."
api_plain_state="$(inspect_target_tag "$API_IMAGE" "$VERSION" "$API_DIGEST")"
api_v_state="$(inspect_target_tag "$API_IMAGE" "v${VERSION}" "$API_DIGEST")"
frontend_plain_state="$(inspect_target_tag "$FRONTEND_IMAGE" "$VERSION" "$FRONTEND_DIGEST")"
frontend_v_state="$(inspect_target_tag "$FRONTEND_IMAGE" "v${VERSION}" "$FRONTEND_DIGEST")"

if [[ "$DRY_RUN" == "true" ]]; then
  write_summary "dry run passed; no tags changed"
  echo "Dry run passed. No GHCR tags were created or changed."
  exit 0
fi

promote_missing_tag "$API_IMAGE" "$VERSION" "$API_DIGEST" "$api_plain_state"
promote_missing_tag "$API_IMAGE" "v${VERSION}" "$API_DIGEST" "$api_v_state"
promote_missing_tag "$FRONTEND_IMAGE" "$VERSION" "$FRONTEND_DIGEST" "$frontend_plain_state"
promote_missing_tag "$FRONTEND_IMAGE" "v${VERSION}" "$FRONTEND_DIGEST" "$frontend_v_state"

verify_final_tag "$API_IMAGE" "$VERSION" "$API_DIGEST"
verify_final_tag "$API_IMAGE" "v${VERSION}" "$API_DIGEST"
verify_final_tag "$FRONTEND_IMAGE" "$VERSION" "$FRONTEND_DIGEST"
verify_final_tag "$FRONTEND_IMAGE" "v${VERSION}" "$FRONTEND_DIGEST"

echo "Approved image manifests were promoted without rebuilding."
write_summary "promotion passed"
