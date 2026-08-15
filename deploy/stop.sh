#!/bin/sh
set -eu

. "$(dirname "$0")/_lib.sh"

require_env
assert_docker
compose stop
echo "TechDesk Pro parado com seguranca. Volumes e dados foram preservados."
