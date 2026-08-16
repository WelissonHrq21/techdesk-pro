# TechDesk Pro v1.0.0 - Instalacao

Este pacote instala o TechDesk Pro usando Docker. A maquina operacional nao precisa de Node.js, npm, TypeScript, Prisma CLI ou Vite.

## Windows

Pre-requisito:

- Docker Desktop instalado e iniciado.

Passos:

1. Extraia o pacote `techdesk-pro-v1.0.0-install.zip`.
2. Abra o PowerShell na pasta extraida `deploy`.
3. Execute:

```powershell
.\install.ps1
```

4. Informe porta, nome/login do ADMIN e senha inicial quando solicitado.
5. Acesse uma das URLs exibidas pelo instalador.

## Linux

Pre-requisito:

- Docker Engine com Docker Compose.

Passos:

```sh
cd deploy
chmod +x *.sh
./install.sh
```

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

## Scripts

Windows:

```powershell
.\start.ps1
.\stop.ps1
.\restart.ps1
.\status.ps1
.\backup.ps1
.\restore-check.ps1 .\backups\arquivo.dump
```

Linux:

```sh
./start.sh
./stop.sh
./restart.sh
./status.sh
./backup.sh
./restore-check.sh ./backups/arquivo.dump
```

`stop` preserva volumes e dados. Nenhum script normal remove volume, apaga banco ou executa reset.

## Firewall

O instalador nao altera firewall automaticamente.

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
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml logs --tail 100 api
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

Producao nao deve seguir `main` automaticamente. Atualizacoes devem usar imagens versionadas, por exemplo `1.0.1`, precedidas de backup e smoke test.
