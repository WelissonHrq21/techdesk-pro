# Operations Runbook - TechDesk Pro

Este runbook descreve como operar o TechDesk Pro em ambiente controlado.

## Subir o sistema

1. Crie um `.env` a partir de `.env.example`.
2. Preencha `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `VITE_API_URL`, `ADMIN_NAME`, `ADMIN_LOGIN` e `ADMIN_PASSWORD`.
3. Suba o stack:

```powershell
docker compose up -d --build
```

## Parar corretamente

```powershell
docker compose down
```

Não use `docker compose down -v` em produção.

## Reiniciar

```powershell
docker compose restart api
docker compose restart frontend
docker compose restart postgres
```

## Verificar containers

```powershell
docker compose ps
docker ps
```

API e Postgres devem aparecer como `healthy`.

## Health e readiness

```powershell
Invoke-RestMethod http://localhost:3333/health
Invoke-RestMethod http://localhost:3333/ready
```

`/health` valida processo HTTP. `/ready` valida conexão com PostgreSQL.

## Logs

```powershell
docker compose logs -f api
docker compose logs --tail 300 api
docker compose logs --tail 300 postgres
```

Para procurar erro crítico:

```powershell
docker compose logs --tail 1000 api | Select-String "500|Unhandled|Prisma error|panic"
```

## PostgreSQL

```powershell
docker compose exec postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB
```

Contagens básicas:

```sql
select count(*) from "User";
select count(*) from "Customer";
select count(*) from "ServiceOrder";
```

## Migrations

Em produção, aplicar:

```powershell
docker compose exec api npx prisma migrate deploy
```

O entrypoint da API já executa `prisma migrate deploy` no startup. Em deploy com múltiplas réplicas, execute migrations como etapa única antes de iniciar novas réplicas.

## Primeiro ADMIN

Configure no `.env`:

```env
ADMIN_NAME="Admin"
ADMIN_LOGIN="admin"
ADMIN_PASSWORD="senha-forte-temporaria"
```

Execute:

```powershell
docker compose exec api npm run seed
```

O seed é idempotente: se o login já existir, não cria outro admin e não sobrescreve senha.

Após o primeiro login, troque a senha inicial pela tela de conta ou pela rota `/me/password`.

## Usuários reais

Fluxo recomendado:

1. ADMIN inicial entra no sistema.
2. ADMIN cria contas individuais reais.
3. Cada pessoa usa sua própria conta.
4. Não use conta compartilhada.

Papéis:

- `ADMIN`: usuários, configurações, peças e gestão geral.
- `RECEPTION`: clientes, equipamentos, abertura, aprovação/rejeição de orçamento, retirada e entrega.
- `TECHNICIAN`: análise, diagnóstico, orçamento, manutenção e consumo de peças aprovado.

## Backup

PowerShell:

```powershell
.\scripts\backup.ps1
```

Shell:

```bash
sh scripts/backup.sh
```

O backup oficial usa `pg_dump -Fc`, gera `.dump`, valida com `pg_restore -l`, calcula SHA256 e falha se o arquivo ficar vazio.

## Validar backup manualmente

```powershell
docker run --rm -v "${PWD}/backups:/backups" postgres:16 pg_restore -l /backups/NOME_DO_BACKUP.dump
Get-FileHash -Algorithm SHA256 .\backups\NOME_DO_BACKUP.dump
```

## Restore em banco de teste

Não teste restore no banco de produção.

```powershell
docker compose exec postgres createdb -U $env:POSTGRES_USER techdesk_restore_test
docker run --rm -v "${PWD}/backups:/backups" --network "$(Split-Path -Leaf $PWD)_default" postgres:16 `
  pg_restore -h postgres -U $env:POSTGRES_USER -d techdesk_restore_test --clean --if-exists /backups/NOME_DO_BACKUP.dump
```

Depois valide contagens e relações principais.

## Restore real

Restore real exige decisão manual explícita.

1. Pare a API.
2. Gere backup extra do banco atual.
3. Valide o backup extra.
4. Crie ou selecione o banco alvo.
5. Execute `pg_restore`.
6. Rode smoke test.
7. Só então libere a API.

## Atualizar versão

1. Gere backup pré-deploy.
2. Atualize imagem/código.
3. Rode migrations.
4. Reinicie API/frontend.
5. Valide health, ready e smoke test.
6. Gere backup pós-deploy.

## Rollback da aplicação

1. Identifique o commit/imagem anterior.
2. Volte a aplicação para a versão anterior.
3. Não restaure banco automaticamente.
4. Restore de banco só com decisão explícita e backup validado.

## O que não fazer

- Não executar `docker compose down -v` em produção.
- Não apagar volume do PostgreSQL.
- Não usar `prisma migrate reset` em produção.
- Não alterar dados manualmente sem backup prévio.
- Não commitar `.env`, dumps, logs ou senhas.
- Não usar Vite dev server como deploy definitivo.
