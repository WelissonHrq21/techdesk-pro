#!/bin/sh
set -eu

DEPLOY_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${DEPLOY_ROOT}/.." && pwd)"
VERSION="$(cat "${DEPLOY_ROOT}/VERSION")"
OUT_DIR="${REPO_ROOT}/dist"
PACKAGE_NAME="techdesk-pro-setup-${VERSION}-stage5-experimental"
STAGING="${OUT_DIR}/${PACKAGE_NAME}"

rm -rf "$STAGING"
mkdir -p "$STAGING/deploy"

copy_file() {
  src="$1"
  dst="$2"
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
}

for file in \
  techdesk \
  setup-core.sh \
  install.sh \
  install.ps1 \
  start.sh \
  start.ps1 \
  stop.sh \
  stop.ps1 \
  restart.sh \
  restart.ps1 \
  status.sh \
  status.ps1 \
  backup.sh \
  backup.ps1 \
  restore-check.sh \
  restore-check.ps1 \
  _lib.sh \
  _lib.ps1 \
  docker-compose.yml \
  seed-admin.js \
  VERSION \
  .env.example \
  README-INSTALL.md \
  README-BACKUP-RESTORE.md; do
  copy_file "${DEPLOY_ROOT}/${file}" "${STAGING}/deploy/${file}"
done

mkdir -p "${STAGING}/deploy/nginx"
copy_file "${DEPLOY_ROOT}/nginx/default.conf" "${STAGING}/deploy/nginx/default.conf"

cat > "${STAGING}/README.txt" <<EOF
TechDesk Pro Setup ${VERSION} - Stage 5 experimental package

Official production target: Ubuntu Server LTS with Docker Engine and Docker Compose Plugin.

Start here:

  cd deploy
  chmod +x *.sh techdesk
  ./techdesk install

This package intentionally excludes .env, secrets, logs, backups, node_modules, source trees and test data.
EOF

if command -v zip >/dev/null 2>&1; then
  (cd "$OUT_DIR" && zip -qr "${PACKAGE_NAME}.zip" "$PACKAGE_NAME")
  echo "${OUT_DIR}/${PACKAGE_NAME}.zip"
else
  tar -C "$OUT_DIR" -czf "${OUT_DIR}/${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"
  echo "${OUT_DIR}/${PACKAGE_NAME}.tar.gz"
fi
