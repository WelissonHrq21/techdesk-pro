#!/bin/sh
set -eu

. "$(dirname "$0")/_lib.sh"

require_env
assert_docker
compose restart || exit 30
wait_ready 120 || exit 60
show_urls
