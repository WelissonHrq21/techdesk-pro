# TechDesk Pro API

API de assistencia tecnica com clientes, equipamentos, ordens de servico, orcamentos, estoque, usuarios, autenticacao JWT, RBAC, documentacao OpenAPI, health checks, logs estruturados, testes automatizados e runtime Docker para producao.

## Requisitos Para Desenvolvimento

- Node.js 24+
- Docker e Docker Compose
- PostgreSQL 16, caso nao use Docker

## Desenvolvimento Local

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL` para o banco local, por exemplo `127.0.0.1:5433`.

2. Suba o banco de desenvolvimento:

```bash
docker compose -f docker-compose.dev.yml up -d
```

3. Instale as dependencias:

```bash
npm install
```

4. Rode as migrations de desenvolvimento:

```bash
npx prisma migrate dev
```

5. Inicie a API:

```bash
npm run dev
```

A API sobe em `http://localhost:3333`.

## Build Local

```bash
npm run build
npm start
```

O build TypeScript gera a pasta `dist/`, e o start executa `node dist/src/server.js`, sem `tsx`.

## Running With Docker

O fluxo de producao nao exige Node nem PostgreSQL instalados no host:

```bash
cp .env.example .env
# preencha POSTGRES_PASSWORD, DATABASE_URL, JWT_SECRET, CORS_ORIGIN e ADMIN_*
docker compose up -d --build
```

No `.env` usado pelo Compose, `DATABASE_URL` deve apontar para o service interno `postgres`, por exemplo:

```env
DATABASE_URL="postgresql://postgres:senha@postgres:5432/techdesk?schema=public"
```

Comandos uteis:

```bash
docker compose ps
docker compose logs -f api
docker compose down
```

Atencao: `docker compose down -v` remove o volume do PostgreSQL e apaga o banco local desse stack.

## Bootstrap Do Admin

O seed nao roda automaticamente no startup. Depois que `api` e `postgres` estiverem saudaveis:

```bash
docker compose exec api npm run seed
```

O seed usa `ADMIN_NAME`, `ADMIN_LOGIN` e `ADMIN_PASSWORD` do ambiente e e idempotente.

## Migrations

Ambientes usam comandos diferentes:

- Desenvolvimento: `npx prisma migrate dev`
- Testes: banco proprio definido por `DATABASE_URL_TEST`
- Producao: `npx prisma migrate deploy`

Em Docker, `docker-entrypoint.sh` roda `prisma migrate deploy` antes da API iniciar. Em ambientes com varias replicas, rode migrations como etapa separada de deploy.

## Endpoints Operacionais

- `GET /health`: verifica se o processo HTTP esta vivo.
- `GET /ready`: verifica se a API consegue consultar o PostgreSQL.
- `GET /docs`: Swagger UI, controlado por `SWAGGER_ENABLED`.
- `POST /sessions`: login e emissao de JWT.
- `GET /me`: usuario autenticado.

As rotas operacionais usam `Authorization: Bearer <token>`.

## Testes

Os testes de integracao usam `DATABASE_URL_TEST`. O setup cria o banco `techdesk_test`, aplica as migrations e limpa os dados entre os testes.

```bash
npm run typecheck
npm run build
npm test
npm run test:coverage
```

## Backup E Restore

Crie backup com:

```bash
sh scripts/backup.sh
```

No PowerShell:

```powershell
.\scripts\backup.ps1
```

Ou manualmente:

```bash
docker compose exec -T postgres pg_dump -U postgres -d techdesk > backups/backup.sql
```

Restaure em um banco alvo com:

```bash
cat backups/backup.sql | docker compose exec -T postgres psql -U postgres -d techdesk
```

Backup confiavel precisa ser testado com restore. Para primeira producao real, use backup diario, retencao minima de 7 dias e copia fora da mesma maquina.

## Logs

A API usa logs estruturados com `pino` e `pino-http` em stdout. Cada request recebe `X-Request-Id`, e campos sensiveis como `Authorization`, `password` e `token` sao redigidos. O Compose limita logs com `max-size: 10m` e `max-file: 5`.

## CI

O workflow em `.github/workflows/ci.yml` sobe PostgreSQL, instala dependencias com `npm ci`, gera Prisma Client, roda typecheck, build, testes, audit informativo de dependencias de producao e Docker build.
