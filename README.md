# TechDesk Pro API

API de assistencia tecnica com clientes, equipamentos, ordens de servico, orcamentos, estoque, usuarios, autenticacao JWT, RBAC, documentacao OpenAPI, health checks e testes automatizados.

## Requisitos

- Node.js 22+
- Docker e Docker Compose
- PostgreSQL 16, caso nao use o `docker-compose.yml`

## Configuracao

1. Copie `.env.example` para `.env`.
2. Suba o banco local:

```bash
docker compose up -d
```

3. Instale as dependencias:

```bash
npm install
```

4. Rode as migracoes e, se quiser, o seed:

```bash
npx prisma migrate deploy
npm run seed
```

5. Inicie a API:

```bash
npm run dev
```

A API sobe em `http://localhost:3333`.

## Endpoints Operacionais

- `GET /health`: verifica se o processo HTTP esta vivo.
- `GET /ready`: verifica se a API consegue consultar o PostgreSQL.
- `GET /docs`: Swagger UI com a documentacao OpenAPI.
- `POST /sessions`: login e emissao de JWT.
- `GET /me`: usuario autenticado.

As rotas operacionais usam `Authorization: Bearer <token>`.

## Testes

Os testes de integracao usam `DATABASE_URL_TEST`. O setup cria o banco `techdesk_test`, aplica as migracoes e limpa os dados entre os testes.

```bash
npm test
npm run typecheck
npm run test:coverage
```

## Logs

A API usa logs estruturados com `pino` e `pino-http`. Cada request recebe `X-Request-Id`, e campos sensiveis como `Authorization`, `password` e `token` sao redigidos nos logs.

## CI

O workflow em `.github/workflows/ci.yml` sobe PostgreSQL, instala dependencias, gera o Prisma Client, roda typecheck e executa a suite automatizada.
