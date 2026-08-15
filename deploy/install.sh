#!/bin/sh
set -eu

. "$(dirname "$0")/_lib.sh"

echo "TechDesk Pro v${VERSION} - instalador Linux"

assert_docker

free_kb="$(df -Pk "$DEPLOY_ROOT" | awk 'NR==2 {print $4}')"
if [ "$free_kb" -lt 5242880 ]; then
  echo "Espaco livre insuficiente. Recomendado: pelo menos 5 GB livres." >&2
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  echo "Instalacao existente detectada. O .env sera preservado."
else
  printf "Porta de acesso do TechDesk Pro [8080]: "
  read -r port
  port="${port:-8080}"

  printf "Nome do ADMIN inicial [Administrador]: "
  read -r admin_name
  admin_name="${admin_name:-Administrador}"

  printf "Login do ADMIN inicial [admin]: "
  read -r admin_login
  admin_login="${admin_login:-admin}"

  printf "Senha do ADMIN inicial: "
  stty -echo
  read -r admin_password
  stty echo
  printf "\n"

  if [ "${#admin_password}" -lt 6 ]; then
    echo "A senha do ADMIN precisa ter pelo menos 6 caracteres." >&2
    exit 1
  fi

  postgres_password="$(hex_secret 32)"
  jwt_secret="$(hex_secret 64)"
  db_name="techdesk"
  db_user="techdesk"
  database_url="postgresql://${db_user}:${postgres_password}@postgres:5432/${db_name}?schema=public"
  suffix=""
  if [ "$port" != "80" ]; then
    suffix=":${port}"
  fi
  origins="http://localhost${suffix},http://$(hostname)${suffix}"
  if command -v hostname >/dev/null 2>&1; then
    for ip in $(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.' || true); do
      origins="${origins},http://${ip}${suffix}"
    done
  fi

  cat > "$ENV_FILE" <<EOF
TECHDESK_PORT=${port}
TECHDESK_PROJECT_NAME=techdesk-prod

POSTGRES_DB=${db_name}
POSTGRES_USER=${db_user}
POSTGRES_PASSWORD=${postgres_password}

DATABASE_URL=${database_url}

JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=8h

CORS_ORIGIN=${origins}
SWAGGER_ENABLED=false
LOG_LEVEL=info

ADMIN_NAME=${admin_name}
ADMIN_LOGIN=${admin_login}
ADMIN_PASSWORD=${admin_password}

TECHDESK_API_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-api:1.0.0
TECHDESK_FRONTEND_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-frontend:1.0.0
EOF
  chmod 600 "$ENV_FILE" 2>/dev/null || true
  echo ".env criado. Secrets foram gravados localmente e nao serao exibidos."
fi

require_env

port="$(techdesk_port)"
if command -v ss >/dev/null 2>&1 && ss -ltn "( sport = :${port} )" | grep -q ":${port}"; then
  echo "Aviso: a porta ${port} ja possui listener local. O Docker pode falhar ao publicar a porta."
fi

compose config >/dev/null
compose pull
compose up -d
wait_ready 120
compose exec -T api node /app/deploy/seed-admin.js
wait_ready 60
show_urls
echo "Instalacao concluida. Troque a senha inicial, configure a empresa e gere o primeiro backup."
