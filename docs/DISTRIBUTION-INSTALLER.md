# TechDesk Pro v1.0.0 - Distribution / Installer

## Estado inicial

- Branch: `main`
- HEAD inicial da sprint: `315cf755cd256deaf4c5dfd8d8b6e6e790585988`
- Tag oficial: `v1.0.0`
- Commit da tag: `8df6e70f3c0b20774fe654ba7433ba5fc6842d66`
- Tag alterada: nao

## Estrategia

O pacote de distribuicao usa Docker Compose com imagens versionadas e nao compila API/frontend na maquina da assistencia.

Imagens planejadas:

- API: `ghcr.io/welissonhrq21/techdesk-pro-api:1.0.0`
- Frontend: `ghcr.io/welissonhrq21/techdesk-pro-frontend:1.0.0`
- Banco: `postgres:16`

O workflow `.github/workflows/release-images.yml` prepara publicacao no GitHub Container Registry com `workflow_dispatch`, permitindo checkout da tag `v1.0.0` sem mover/recriar a tag existente.

## Same-origin

O frontend deve ser buildado com:

```text
VITE_API_URL=/api
```

O pacote monta `deploy/nginx/default.conf` no container frontend e faz proxy:

```text
browser -> frontend nginx -> /api -> api:3333
```

Isso evita rebuild por IP/hostname. A configuracao de Nginx pertence ao pacote de distribuicao; o codigo React nao foi alterado.

## Compose

Arquivo:

```text
deploy/docker-compose.yml
```

Servicos:

- `postgres`: sem porta publica, volume nomeado, healthcheck.
- `api`: imagem versionada, depende do Postgres healthy, roda migrations no startup via override de entrypoint do compose.
- `frontend`: imagem versionada, publica uma porta unica, healthcheck e proxy `/api`.

Volume:

```text
techdesk_pgdata
```

Com projeto `techdesk-prod`, o volume real esperado e:

```text
techdesk-prod_techdesk_pgdata
```

## Env

Template:

```text
deploy/.env.example
```

O instalador cria `.env` local com:

- senha PostgreSQL nova;
- `JWT_SECRET` novo;
- senha inicial do ADMIN informada pelo operador;
- `CORS_ORIGIN` com URLs locais detectadas;
- `SWAGGER_ENABLED=false`.

Secrets nao sao versionados e nao entram no pacote.

## Scripts

Windows:

- `install.ps1`
- `start.ps1`
- `stop.ps1`
- `restart.ps1`
- `status.ps1`
- `backup.ps1`
- `restore-check.ps1`

Linux:

- `install.sh`
- `start.sh`
- `stop.sh`
- `restart.sh`
- `status.sh`
- `backup.sh`
- `restore-check.sh`

Nenhum script remove volume, executa `migrate reset` ou apaga banco.

## Seed ADMIN

O container runtime da API nao deve depender de Node/npm no host. O pacote monta `deploy/seed-admin.js` e executa:

```text
node /app/deploy/seed-admin.js
```

O helper e idempotente:

- cria o ADMIN se nao existir;
- se ja existir, nao duplica.

## Backup

Os scripts de backup usam:

- `pg_dump -Fc`;
- timestamp;
- validacao com `pg_restore -l`;
- SHA256.

O README orienta copia off-host.

## Limitacoes atuais

- As imagens ainda precisam ser publicadas no registry; push direto local retornou `denied`.
- O Docker daemon foi iniciado depois; smoke limpo por container passou com imagens locais buildadas da tag `v1.0.0`.
- O pacote foi testado em diretorio limpo, mas a aprovacao final depende de publicar/puxar as imagens em ambiente sem cache.
