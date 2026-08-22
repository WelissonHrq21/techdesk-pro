# TechDesk Pro - Instalacao e Setup

Este pacote instala o TechDesk Pro usando Docker. A maquina operacional nao precisa de Node.js, npm, TypeScript, Prisma CLI ou Vite.

## Caminho recomendado

A partir da v1.1.x, o ponto de entrada recomendado no Linux e:

```sh
cd deploy
chmod +x *.sh techdesk
./techdesk install
```

Depois da instalacao:

```sh
/opt/techdesk-pro/techdesk status
sudo /opt/techdesk-pro/techdesk repair
sudo /opt/techdesk-pro/techdesk backup
sudo /opt/techdesk-pro/techdesk upgrade --version X.Y.Z
```

O diretorio extraido do installer pode ser removido depois de um `install`
bem-sucedido. A operacao permanente fica em `/opt/techdesk-pro`.

Producao oficial:

- Ubuntu Server LTS suportado pelo Docker Engine.
- Docker Engine.
- Docker Compose Plugin.

Windows continua best effort para desenvolvimento/laboratorio pelos scripts PowerShell.

## Linux

Pre-requisitos:

- Docker Engine instalado.
- Docker Compose Plugin instalado.
- Porta de acesso livre, padrao `8080`.
- Pelo menos 5 GB livres.

Fluxo simples:

1. Prepare Ubuntu/Docker.
2. Baixe e extraia o pacote TechDesk Setup.
3. Execute `./techdesk install`.
4. Abra a URL exibida ao final.

O setup executa preflight, gera secrets tecnicos, cria `.env`, baixa imagens versionadas, inicia containers, aplica migrations pelo startup da API, executa smoke `health/ready` e grava metadata local.

No Linux, o `install` copia primeiro os arquivos operacionais necessarios para
`/opt/techdesk-pro` e continua a partir desse runtime persistente. Se esse
diretorio exigir privilegio, o instalador solicita `sudo` antes de modificar
estado importante. Sem permissao para preparar o runtime, a instalacao falha
antes de gerar secrets, iniciar containers ou tocar no banco.

## Windows

- Docker Desktop instalado e iniciado.

Passos:

1. Extraia o pacote `techdesk-pro-setup-1.1.1-rc.N.tar.gz` ou o pacote final aprovado.
2. Abra o PowerShell na pasta extraida `deploy`.
3. Execute:

```powershell
.\install.ps1
```

4. Informe porta, nome/login do ADMIN e senha inicial quando solicitado.
5. Acesse uma das URLs exibidas pelo instalador.

Windows nao e plataforma oficial de producao nesta versao.

## Scripts legados

Os scripts antigos continuam disponiveis por compatibilidade e manutencao:

Linux:

```sh
./install.sh
./start.sh
./stop.sh
./restart.sh
./status.sh
./backup.sh
./restore-check.sh ./backups/arquivo.dump
```

Windows:

```powershell
.\install.ps1
.\start.ps1
.\stop.ps1
.\restart.ps1
.\status.ps1
.\backup.ps1
.\restore-check.ps1 .\backups\arquivo.dump
```

`stop`, `repair` e scripts normais preservam volumes e dados. Nenhum script normal remove volume, apaga banco ou executa reset.

## Comandos do setup

### INSTALL

```sh
./techdesk install
```

Instalacao nova. Nao sobrescreve `.env` existente e nao continua se detectar instalacao existente, volume, containers ou estado ambiguo.

Modo nao interativo para automacao futura:

```sh
./techdesk install --port 8080 --non-interactive --admin-password "senha-forte"
```

### STATUS

```sh
/opt/techdesk-pro/techdesk status
```

Mostra versao, estado da instalacao, runtime, `.env`, metadata, logs, backups,
Docker, Compose, containers, health, ready e URLs. Nao mostra secrets.

`status` e read-only e nao cria log persistente. Ele pode ser executado sem
`sudo`: usa a metadata publica para descobrir versao, projeto e porta sem ler
o `.env`. Se o usuario nao tiver acesso ao Docker socket, o comando mostra um
diagnostico especifico e ainda verifica `health` e `ready` por HTTP.

### REPAIR

```sh
sudo /opt/techdesk-pro/techdesk repair
```

Operacao nao destrutiva. Pode subir containers parados, baixar imagem conhecida ausente, revalidar health/ready e preservar banco, volumes e secrets.

No runtime oficial em `/opt/techdesk-pro`, execute com `sudo`. O CLI valida a
permissao antes de criar logs ou iniciar alteracoes.

Nao executa:

- `down -v`;
- reset de banco;
- downgrade;
- troca de secrets;
- restore automatico.

### UPGRADE

```sh
sudo /opt/techdesk-pro/techdesk upgrade --version X.Y.Z
```

Exige backup pre-upgrade validado antes de trocar imagens. Bloqueia downgrade automatico e so atualiza metadata depois de health/ready/smoke passarem.

No runtime oficial em `/opt/techdesk-pro`, execute com `sudo`. O CLI falha cedo
com diagnostico de privilegio quando nao puder alterar `.env`, logs ou backups.

Versoes invalidas, como `invalid`, `1`, `1.0` ou `abc`, falham como SemVer
invalido antes da classificacao de downgrade.

### BACKUP

```sh
sudo /opt/techdesk-pro/techdesk backup
```

Gera dump PostgreSQL em formato custom (`pg_dump -Fc`), valida com
`pg_restore -l`, calcula SHA256 e salva por padrao em:

```text
/opt/techdesk-pro/backups
```

Tambem e possivel usar `BACKUP_DIR=/mnt/backup/techdesk` para direcionar a
copia local a outro volume persistente.

## Primeiro acesso

Depois da instalacao:

1. Entre com o ADMIN inicial.
2. Troque a senha inicial.
3. Configure os dados da empresa em Configuracoes.
4. Crie usuarios individuais para recepcao, tecnico e administracao.
5. Nao compartilhe a conta `admin`.
6. Execute o primeiro backup.

## Rede local

O TechDesk Pro fica disponivel pela porta `TECHDESK_PORT` definida no `.env`.

Exemplo:

```text
Servidor: 192.168.1.50
Acesso: http://192.168.1.50:8080
```

Reserve IP fixo ou DHCP reservation para o servidor. Se o IP mudar, atualize `CORS_ORIGIN` no `.env` e reinicie com `restart`.

## Metadata, logs e secrets

O setup pode criar:

```text
/opt/techdesk-pro/.env
/opt/techdesk-pro/techdesk-installation.json
/opt/techdesk-pro/logs/setup-YYYY-MM-DD_HHMMSS.log
/opt/techdesk-pro/backups/
```

Metadata nao guarda `POSTGRES_PASSWORD`, `JWT_SECRET`, `ADMIN_PASSWORD`, tokens ou dados funcionais da assistencia.

Logs sao sanitizados para nao registrar secrets, connection strings com senha, Bearer token ou `publicToken`.

No Linux, `.env` e logs individuais usam modo `600`; diretorios de logs e
backups usam `700`. A metadata e o arquivo publico `VERSION` usam `644` para
permitir o `status` read-only e nao contem secrets, senhas, tokens ou dados
funcionais da assistencia.

O `.env` nao e recriado em rerun, repair ou upgrade. `JWT_SECRET`,
`POSTGRES_PASSWORD` e `ADMIN_PASSWORD` existentes sao preservados.

## Firewall

O instalador nao altera firewall automaticamente.

Se UFW estiver ativo e a porta nao parecer liberada, o setup emite WARNING e sugere o comando. Ele nao abre firewall sem consentimento.

Se outras maquinas da LAN nao acessarem, libere a porta configurada em `TECHDESK_PORT` somente para a rede local. Por padrao, a API e o PostgreSQL nao sao publicados em portas externas.

## Backup e recuperacao

`backup` gera dump PostgreSQL em formato custom (`pg_dump -Fc`), valida com `pg_restore -l` e mostra SHA256.

Um backup no mesmo disco nao e suficiente. Copie tambem para outro computador, NAS, HD externo ou storage definido pela assistencia.

Configure backup desde o primeiro dia de uso real.

Leia o procedimento oficial antes de depender de um backup em producao:

```text
README-BACKUP-RESTORE.md
```

Esse guia documenta:

- criacao e verificacao de backup;
- restore em banco isolado;
- restore real conservador;
- recuperacao em maquina nova;
- secrets/configuracao que ficam fora do dump;
- rollback se o restore falhar;
- politica de copia fora do servidor e retencao.

Backup nao testado nao deve ser considerado recuperacao garantida.

## Troubleshooting

Docker nao inicia:

- Abra o Docker Desktop ou inicie o servico Docker no Linux.
- Rode `status` novamente.

Porta em uso:

- Edite `TECHDESK_PORT` no `.env`.
- Rode `restart`.

Container unhealthy:

- Rode `status`.
- Verifique logs com:

```sh
docker compose --project-directory /opt/techdesk-pro -p techdesk-prod --env-file /opt/techdesk-pro/.env -f /opt/techdesk-pro/docker-compose.yml logs --tail 100 api
```

API nao fica ready:

- Confirme que o container `postgres` esta healthy.
- Confirme que o `.env` possui `DATABASE_URL`, `JWT_SECRET` e `CORS_ORIGIN`.

Senha admin esquecida:

- Nao existe reset destrutivo no pacote.
- Um administrador existente deve criar/trocar a senha pela aplicacao.
- Se todos os acessos administrativos forem perdidos, tratar como procedimento tecnico controlado.

IP da maquina mudou:

- Atualize `CORS_ORIGIN` no `.env` com a nova URL.
- Rode `restart`.

## Atualizacoes

Producao nao deve seguir `main` automaticamente. Atualizacoes devem usar imagens versionadas, por exemplo `1.1.1`, precedidas de backup validado e smoke test.

A v1.1.0 ja foi publicada. Use uma versao de patch aprovada, como `1.1.1`,
quando o objetivo for corrigir instalacoes v1.1.0 existentes sem entrar no
escopo planejado para v1.2.0.

## Desinstalacao futura

Esta Stage nao implementa uninstall destrutivo. Remover TechDesk de producao
deve continuar sendo um procedimento manual e deliberado, com backup validado,
porque envolve containers, volume PostgreSQL, `.env`, logs e backups.
