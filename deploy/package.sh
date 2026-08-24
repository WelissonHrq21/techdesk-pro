#!/bin/sh
set -eu

DEPLOY_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${DEPLOY_ROOT}/.." && pwd)"
VERSION="$(cat "${DEPLOY_ROOT}/VERSION")"
OUT_DIR="${PACKAGE_OUT_DIR:-${REPO_ROOT}/dist}"
PACKAGE_SUFFIX="${PACKAGE_SUFFIX-rc}"
PACKAGE_VERSION="$VERSION"
if [ -n "$PACKAGE_SUFFIX" ]; then
  PACKAGE_VERSION="${VERSION}-${PACKAGE_SUFFIX}"
  PACKAGE_NAME="techdesk-pro-setup-${VERSION}-${PACKAGE_SUFFIX}"
  PACKAGE_LABEL="Release Candidate package"
else
  PACKAGE_NAME="techdesk-pro-setup-${VERSION}"
  PACKAGE_LABEL="Release package"
fi
STAGING="${OUT_DIR}/${PACKAGE_NAME}"

mkdir -p "$OUT_DIR"
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
  observability.sh \
  backup-contracts.sh \
  operational-contracts.sh \
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

printf '%s\n' "$PACKAGE_VERSION" > "${STAGING}/deploy/VERSION"

version_pattern="$(printf '%s' "$VERSION" | sed 's/\./\\./g')"
for file in \
  .env.example \
  docker-compose.yml \
  install.ps1; do
  sed \
    -e "s|TECHDESK_VERSION=${version_pattern}|TECHDESK_VERSION=${PACKAGE_VERSION}|g" \
    -e "s|ghcr.io/welissonhrq21/techdesk-pro-api:${version_pattern}|ghcr.io/welissonhrq21/techdesk-pro-api:${PACKAGE_VERSION}|g" \
    -e "s|ghcr.io/welissonhrq21/techdesk-pro-frontend:${version_pattern}|ghcr.io/welissonhrq21/techdesk-pro-frontend:${PACKAGE_VERSION}|g" \
    "${STAGING}/deploy/${file}" > "${STAGING}/deploy/${file}.tmp"
  mv "${STAGING}/deploy/${file}.tmp" "${STAGING}/deploy/${file}"
done

mkdir -p "${STAGING}/deploy/nginx"
copy_file "${DEPLOY_ROOT}/nginx/default.conf" "${STAGING}/deploy/nginx/default.conf"

cat > "${STAGING}/README.txt" <<EOF
TechDesk Pro Setup ${PACKAGE_VERSION} - ${PACKAGE_LABEL}

Official production target: Ubuntu Server LTS with Docker Engine and Docker Compose Plugin.

Start here:

  cd deploy
  chmod +x *.sh techdesk
  ./techdesk install

This package intentionally excludes .env, secrets, logs, backups, node_modules, source trees and test data.
EOF

if command -v tar >/dev/null 2>&1 && command -v gzip >/dev/null 2>&1; then
  ARCHIVE_WORK_DIR="$(mktemp -d)"
  ARCHIVE_PATH="${OUT_DIR}/${PACKAGE_NAME}.tar.gz"
  ARCHIVE_TMP="${ARCHIVE_PATH}.tmp.$$"
  TAR_TMP="${ARCHIVE_WORK_DIR}/${PACKAGE_NAME}.tar"
  trap 'rm -rf "$ARCHIVE_WORK_DIR"; rm -f "$ARCHIVE_TMP"' EXIT INT TERM
  cp -R "$STAGING" "${ARCHIVE_WORK_DIR}/${PACKAGE_NAME}"
  find "${ARCHIVE_WORK_DIR}/${PACKAGE_NAME}" -type f -exec sed -i 's/\r$//' {} +
  find "${ARCHIVE_WORK_DIR}/${PACKAGE_NAME}" -type d -exec chmod 755 {} +
  find "${ARCHIVE_WORK_DIR}/${PACKAGE_NAME}" -type f -exec chmod 644 {} +
  chmod 755 \
    "${ARCHIVE_WORK_DIR}/${PACKAGE_NAME}/deploy/techdesk" \
    "${ARCHIVE_WORK_DIR}/${PACKAGE_NAME}/deploy/"*.sh
  case "${SOURCE_DATE_EPOCH:-0}" in
    ''|*[!0-9]*)
      echo "SOURCE_DATE_EPOCH precisa ser um timestamp Unix nao negativo." >&2
      exit 2
      ;;
  esac
  LC_ALL=C TZ=UTC tar \
    --sort=name \
    --format=gnu \
    --owner=0 \
    --group=0 \
    --numeric-owner \
    --mtime="@${SOURCE_DATE_EPOCH:-0}" \
    -C "$ARCHIVE_WORK_DIR" \
    -cf "$TAR_TMP" \
    "$PACKAGE_NAME"
  gzip -n -9 -c "$TAR_TMP" > "$ARCHIVE_TMP"
  mv "$ARCHIVE_TMP" "$ARCHIVE_PATH"
  echo "$ARCHIVE_PATH"
elif command -v zip >/dev/null 2>&1; then
  (cd "$OUT_DIR" && zip -qr "${PACKAGE_NAME}.zip" "$PACKAGE_NAME")
  echo "${OUT_DIR}/${PACKAGE_NAME}.zip"
else
  echo "tar ou zip nao encontrado para gerar pacote." >&2
  exit 1
fi
