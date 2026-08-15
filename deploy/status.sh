#!/bin/sh
set -eu

. "$(dirname "$0")/_lib.sh"

require_env
assert_docker
echo "TechDesk Pro v${VERSION}"
compose ps

url="$(base_url)"
if curl -fsS "${url}/health" >/dev/null 2>&1; then
  echo "Health: ok"
else
  echo "Health: error"
fi

if curl -fsS "${url}/api/ready" >/dev/null 2>&1; then
  echo "Ready: ok"
else
  echo "Ready: error"
fi

show_urls
