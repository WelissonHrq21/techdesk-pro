#!/bin/sh
set -eu

DEPLOY_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

exec "${DEPLOY_ROOT}/techdesk" install "$@"
