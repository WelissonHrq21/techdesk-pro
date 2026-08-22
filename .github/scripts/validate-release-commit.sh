#!/usr/bin/env bash

set -Eeuo pipefail

if [[ ! "${RELEASE_COMMIT:-}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "RELEASE_COMMIT must be a full lowercase 40-character commit SHA." >&2
  exit 1
fi

if [[ "$(git rev-parse HEAD)" != "$RELEASE_COMMIT" ]]; then
  echo "Checked out commit does not match RELEASE_COMMIT." >&2
  exit 1
fi

git fetch --no-tags origin main

if ! git merge-base --is-ancestor "$RELEASE_COMMIT" origin/main; then
  echo "RELEASE_COMMIT must be integrated into origin/main." >&2
  exit 1
fi

latest_conclusion="$(
  gh api \
    "repos/${GITHUB_REPOSITORY}/actions/workflows/ci.yml/runs?head_sha=${RELEASE_COMMIT}&status=completed&per_page=20" \
    --jq 'if (.workflow_runs | length) == 0 then "" else .workflow_runs[0].conclusion end'
)"

if [[ "$latest_conclusion" != "success" ]]; then
  echo "The latest completed CI workflow run for RELEASE_COMMIT is not successful." >&2
  exit 1
fi

echo "Release commit exists on main and has a successful CI run."
