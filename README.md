# TechDesk Pro

Sistema para operação de assistência técnica, cobrindo balcão, bancada, orçamento, manutenção, estoque, usuários, impressão e consulta pública do andamento da OS.

## Stack

- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL.
- Frontend: React, TypeScript, Vite, React Router, TanStack Query, Axios, Tailwind CSS.
- Infra: Docker Compose, PostgreSQL 16, Nginx para frontend estático.
- Segurança: JWT, RBAC, Helmet, CORS explícito, logs com redaction.

## Funcionalidades principais

- Login e sessão JWT.
- Papéis `ADMIN`, `RECEPTION` e `TECHNICIAN`.
- Clientes e equipamentos.
- Abertura de ordem de serviço.
- Ciclo da OS: recebida, análise, aprovação, manutenção, finalização, retirada e entrega.
- Diagnóstico técnico.
- Orçamentos versionados.
- Aprovação/rejeição de orçamento.
- Peças e estoque auditável.
- Consumo de peça vinculado à OS.
- Dashboard operacional.
- Configurações da empresa.
- Impressão de protocolo e orçamento.
- Consulta pública por token.
- Health checks e documentação OpenAPI.

## Requisitos

- Node.js 24+
- Docker e Docker Compose
- PostgreSQL 16, caso rode sem Docker

## Ambiente

Copie `.env.example` para `.env` e preencha valores reais:

```powershell
Copy-Item .env.example .env
```

Variáveis principais:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`
- `VITE_API_URL`
- `SWAGGER_ENABLED`
- `LOG_LEVEL`
- `ADMIN_NAME`
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD`

Não commite `.env`, `.env.pilot`, dumps, logs ou senhas.

## Desenvolvimento

Suba o banco local:

```powershell
docker compose -f docker-compose.dev.yml up -d
```

Instale dependências e rode migrations:

```powershell
npm install
npx prisma migrate dev
npm run dev
```

A API local roda em `http://localhost:3333`.

Frontend local:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Para desenvolvimento, `frontend/.env` pode usar:

```env
VITE_API_URL=http://localhost:3333
```

## Produção com Docker Compose

Para instalacao real em Linux, use o pacote de setup em vez de rodar a raiz do
repositorio. O runtime permanente fica em `/opt/techdesk-pro`:

```bash
cd deploy
chmod +x *.sh techdesk
./techdesk install
/opt/techdesk-pro/techdesk status
```

Logs e backups ficam em `/opt/techdesk-pro/logs` e
`/opt/techdesk-pro/backups`. O diretorio extraido do installer pode ser
removido depois do install.

O stack de produção inclui PostgreSQL, API e frontend estático. Para
desenvolvimento ou build manual:

```powershell
docker compose up -d --build
```

Comportamento esperado:

- PostgreSQL sem porta pública.
- Volume persistente `techdesk_pgdata`.
- API com restart policy, healthcheck, log rotation e migrations via `prisma migrate deploy`.
- Frontend servido por Nginx, com fallback SPA para rotas como `/login`, `/customers`, `/service-orders/:id`, `/parts`, `/users`, `/settings` e `/track/:token`.
- `CORS_ORIGIN` explícito.
- `SWAGGER_ENABLED=false` recomendado em produção real.

Exemplo de URLs:

- API: `https://api.sua-assistencia.com`
- Frontend: `https://app.sua-assistencia.com`
- `VITE_API_URL=https://api.sua-assistencia.com`
- `CORS_ORIGIN=https://app.sua-assistencia.com`

## Build

Backend:

```powershell
npm run build
npm start
```

Frontend:

```powershell
cd frontend
npm run build
```

O frontend gera `frontend/dist`.

## Migrations

Desenvolvimento:

```powershell
npx prisma migrate dev
```

Produção:

```powershell
npx prisma migrate deploy
```

No Docker, o entrypoint da API executa `prisma migrate deploy` antes de iniciar o servidor.

## Primeiro ADMIN

Configure `ADMIN_NAME`, `ADMIN_LOGIN` e `ADMIN_PASSWORD` no ambiente e execute:

```powershell
docker compose exec api npm run seed
```

O seed é idempotente: não cria múltiplos admins para o mesmo login e não sobrescreve usuário existente. Após o primeiro login, troque a senha inicial pela conta do usuário ou pela rota `/me/password`.

## Testes

Backend:

```powershell
npm run typecheck
npm test
npm run build
```

Frontend:

```powershell
cd frontend
npm run lint
npm test
npm run build
```

Auditoria de dependências:

```powershell
npm audit
cd frontend
npm audit
```

## Health, readiness e logs

- `GET /health`: processo HTTP vivo.
- `GET /ready`: API consegue consultar PostgreSQL.
- `GET /docs`: Swagger UI quando `SWAGGER_ENABLED=true`.

Logs:

```powershell
docker compose logs -f api
docker compose logs --tail 300 postgres
```

## Backup e restore

Backup oficial:

```powershell
.\scripts\backup.ps1
```

Ou:

```bash
sh scripts/backup.sh
```

O backup usa `pg_dump -Fc`, gera `.dump`, valida com `pg_restore -l` e calcula SHA256.

Restore deve ser testado primeiro em banco isolado. Não execute restore destrutivo em produção sem backup prévio validado e decisão manual explícita.

Procedimentos completos ficam em:

- `docs/OPERATIONS-RUNBOOK.md`
- `docs/RELEASE-CHECKLIST.md`

## Dados do piloto

O banco piloto contém dados artificiais de validação. Para uma primeira produção real, a recomendação é iniciar com banco/volume limpo, aplicar `prisma migrate deploy`, executar seed do ADMIN e configurar dados da empresa antes do primeiro atendimento.

Não use `prisma migrate reset` em produção.

## Release

Versão preparada: `1.0.0 Release Candidate`.

Não criar tag `v1.0.0` até aprovação final da RC.
