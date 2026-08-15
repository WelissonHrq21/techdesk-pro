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
- API image local ID: `sha256:99955c5e09e75820508b098134b84edb129b299d06ad961b5d56203f2bd7fc73`
- Frontend image local ID: `sha256:61f47d6f7ece0e52d133375acddf8be741c8dc3e1b52778a416620901dbcdc65`

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

Push direto para GHCR falhou com `denied` para API e frontend. Portanto uma maquina nova ainda nao consegue instalar apenas pelo ZIP ate as imagens serem publicadas no registry. O workflow de publicacao foi preparado para executar via GitHub Actions com permissao `packages: write`.
