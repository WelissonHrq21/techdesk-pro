# TechDesk Pro v1.0.0 - Notas de Distribuicao

## Estrategia escolhida

Installer baseado em Docker Compose e imagens versionadas no GitHub Container Registry.

## Registry

Planejado:

```text
ghcr.io/welissonhrq21
```

## Imagens

```text
ghcr.io/welissonhrq21/techdesk-pro-api:1.0.0
ghcr.io/welissonhrq21/techdesk-pro-frontend:1.0.0
postgres:16
```

Digests: pendentes ate publicacao e pull em ambiente sem cache.

## Same-origin

Ativado via build arg do frontend:

```text
VITE_API_URL=/api
```

E via Nginx de distribuicao:

```text
/api -> api:3333
```

Codigo React nao foi alterado nesta sprint.

O compose tambem sobrescreve o entrypoint da API para evitar a falha do script embutido na imagem `v1.0.0` em ambiente Linux containerizado. O comando efetivo continua sendo migrations antes do servidor.

## Compose e scripts

Pasta:

```text
deploy/
```

Inclui compose, env example, scripts Windows/Linux, backup, restore-check, seed idempotente e README de instalacao.

## Pacote ZIP

Nome planejado:

```text
techdesk-pro-v1.0.0-install.zip
```

O pacote deve conter somente arquivos de instalacao, sem `.env`, secrets, dumps, banco, logs, screenshots, `node_modules` ou dados piloto.

## Testes pendentes

Pendentes por dependerem de Docker daemon ativo e imagens publicadas:

- pull sem cache;
- instalacao limpa a partir do ZIP;
- migrations;
- seed;
- login;
- smoke funcional;
- tracking;
- persistencia;
- reinstalacao;
- backup real;
- erro com porta ocupada.

## SemVer

A tag `v1.0.0` nao foi alterada. Se a publicacao das imagens exigir alterar codigo de produto alem de configuracao de distribuicao, a instalacao deve ser reclassificada para patch release futura, sem fingir que e a tag `v1.0.0`.


## Resultado de validacao local

- ZIP gerado: `dist/techdesk-pro-v1.0.0-install.zip`
- Tamanho: `16828 bytes`
- SHA256: `498CD52F617DD32253C2A516BA11F6E81F266204322FF4DA5369BAA40D801358`
- Fonte das imagens locais: `v1.0.0` (`8df6e70f3c0b20774fe654ba7433ba5fc6842d66`)
- API image digest publicado: `ghcr.io/welissonhrq21/techdesk-pro-api@sha256:eb525285efb2d8473671440bd7b43044dbf0ad5e78581e431131312411c55228`
- Frontend image digest publicado: `ghcr.io/welissonhrq21/techdesk-pro-frontend@sha256:f79c79e67bb937829ca5b595f1640a1297998bcbfdad44a6183be3d62a03ef3e`

Teste limpo via ZIP em `techdesk-installer-test-4`:

- Compose subiu `postgres`, `api`, `frontend`.
- Volume novo criado: `techdesk-installer-test-4_techdesk_pgdata`.
- 12 migrations aplicadas.
- Banco iniciou limpo: `User`, `Customer`, `Equipment`, `ServiceOrder`, `Budget`, `StockMovement` = 0.
- Seed ADMIN idempotente: primeira execucao criou, segunda informou que ja existia.
- Login `/api/sessions` retornou token; `/api/me` retornou `ADMIN`.
- `/health` e `/api/ready` retornaram 200.
- `/api/docs` retornou 404 com `SWAGGER_ENABLED=false`.
- CORS retornou origem permitida para `http://localhost:18083` e nao retornou `Access-Control-Allow-Origin` para origem indevida.
- `status.ps1`, `restart.ps1`, `backup.ps1` e `restore-check.ps1` passaram.
- Backup de teste: `28568 bytes`; SHA256 `F3A5DE1DFC4FFDE7F3DF2ADE863E3CBBCDE3D513B20168199884C15B01D9ECEE`.

## Bloqueio restante

Push direto local para GHCR falhou com `denied`, mas o workflow `Release Docker Images` foi disparado no GitHub Actions e concluiu com sucesso: https://github.com/WelissonHrq21/techdesk-pro/actions/runs/31896885634. Depois disso, `docker pull` validou as imagens publicadas.

## Smoke funcional via pacote

Executado no stack `techdesk-installer-test-4` usando o ZIP extraido e imagens publicadas:

- ADMIN `/users`: 200.
- RECEPTION `/users`: 403.
- TECHNICIAN `/users`: 403.
- CompanySettings atualizado.
- Peca criada, entrada `+2`, consumo `1`, estoque final `1`.
- Cliente, equipamento e OS criados.
- Fluxo da OS: `RECEIVED -> IN_ANALYSIS -> AWAITING_APPROVAL -> BUDGET_APPROVED -> IN_MAINTENANCE -> FINISHED -> AWAITING_PICKUP -> DELIVERED`.
- Budget V1 criado e aprovado.
- Tracking publico retornou `DELIVERED` sem login.
- Tracking invalido retornou 404.
- Backup pos-smoke: `30524 bytes`; SHA256 `2BC7959C2BB8661BE9F03B17AA21EFB59510B700342C06B1DC053E2E9A41DBDD`.
- `restore-check.ps1` validou o dump com `pg_restore -l`.
