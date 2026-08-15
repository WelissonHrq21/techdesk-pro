#!/bin/sh
set -eu

. "$(dirname "$0")/_lib.sh"

require_env
assert_docker
compose up -d
wait_ready 120
show_urls
