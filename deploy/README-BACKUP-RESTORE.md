# TechDesk Pro v1.1.0 - Backup, Restore e Disaster Recovery

Este guia e o procedimento oficial para backup, verificacao, restore e recuperacao de desastre do TechDesk Pro instalado pelo pacote `deploy`.

Use este documento no servidor de operacao. Ele nao exige Node.js, npm, TypeScript, Prisma CLI ou acesso ao codigo-fonte.

## 1. Visao geral

O TechDesk Pro v1.1.0 armazena os dados operacionais no PostgreSQL do Docker Compose.

O backup oficial e um dump PostgreSQL em formato custom archive:

```text
pg_dump -Fc
```

Esse formato permite validacao com `pg_restore -l` e restore controlado com `pg_restore`.

Importante:

- arquivo existente nao significa backup recuperavel;
- backup precisa ser validado;
- restore precisa ser testado em banco isolado antes de qualquer uso em producao;
- um backup salvo somente no mesmo SSD do servidor nao protege contra perda da maquina.

## 2. O que o backup protege

O dump PostgreSQL protege estrutura e dados do banco, incluindo:

- `_prisma_migrations`;
- `User`;
- `Customer`;
- `Equipment`;
- `ServiceOrder`;
- `Accessory`;
- `Budget`;
- `BudgetItem`;
- `Part`;
- `StockMovement`;
- `ServiceOrderHistory`;
- `CompanySettings`;
- indices, constraints, enums e relacionamentos criados pelas migrations.

Isso inclui usuarios, clientes, equipamentos, ordens de servico, orcamentos, pecas, estoque, historicos, configuracoes da empresa e o estado das migrations.

## 3. O que o backup NAO protege

O dump do PostgreSQL nao protege arquivos externos ao banco.

Na v1.1.0, a aplicacao nao possui uploads de imagens/anexos persistidos fora do PostgreSQL. Se uma versao futura adicionar uploads, a pasta/volume desses arquivos devera ter backup separado.

O dump tambem nao protege:

- `.env` da instalacao;
- `JWT_SECRET`;
- senha do PostgreSQL;
- porta de acesso;
- `CORS_ORIGIN`;
- nomes das imagens Docker;
- regras de firewall;
- arquivos do installer;
- copias off-host dos backups.

Guarde a configuracao operacional separadamente, sem versionar secrets em Git.

## 4. Pre-requisitos

No servidor instalado:

- Docker rodando;
- pasta `deploy` extraida do installer;
- arquivo `.env` existente;
- `docker-compose.yml` da distribuicao;
- espaco livre suficiente para criar o dump;
- permissao para gravar na pasta `backups`.

Windows:

```powershell
cd CAMINHO\PARA\deploy
.\status.ps1
```

Linux:

```sh
cd /caminho/para/deploy
./status.sh
```

Confirme que `postgres`, `api` e `frontend` estao saudaveis antes do backup.

## 5. Criar backup

Windows:

```powershell
cd CAMINHO\PARA\deploy
.\backup.ps1
```

Linux:

```sh
cd /caminho/para/deploy
./backup.sh
```

O script:

- identifica o banco pelo `.env`;
- executa `pg_dump -Fc` dentro do container `postgres`;
- copia o dump para `deploy/backups`;
- usa timestamp no nome;
- falha se o arquivo estiver vazio;
- valida a listagem com `pg_restore -l`;
- calcula SHA256.

Nome esperado:

```text
backup-inicial-producao-YYYY-MM-DD_HH-MM-SS.dump
```

Se preferir outra pasta:

Windows:

```powershell
$env:BACKUP_DIR="D:\Backups\TechDesk"
.\backup.ps1
```

Linux:

```sh
BACKUP_DIR=/mnt/backup/techdesk ./backup.sh
```

## 6. Verificar SHA256 e tamanho

Guarde o SHA256 junto com o arquivo de backup, em local separado.

Windows:

```powershell
Get-Item .\backups\NOME.dump
Get-FileHash -Algorithm SHA256 .\backups\NOME.dump
```

Linux:

```sh
ls -lh ./backups/NOME.dump
sha256sum ./backups/NOME.dump
```

Antes de restaurar, compare o SHA256 atual com o SHA256 registrado quando o backup foi criado.

## 7. Validar dump

Validacao minima:

Windows:

```powershell
.\restore-check.ps1 .\backups\NOME.dump
.\restore-check.ps1 .\backups\NOME.dump SHA256_ESPERADO
```

Linux:

```sh
./restore-check.sh ./backups/NOME.dump
./restore-check.sh ./backups/NOME.dump SHA256_ESPERADO
```

O `restore-check` da distribuicao:

- rejeita dump inexistente;
- rejeita arquivo vazio;
- rejeita SHA256 divergente quando o hash esperado e informado;
- valida `pg_restore -l`;
- calcula SHA256;
- restaura em um banco temporario isolado;
- valida tabelas criticas;
- remove o banco temporario ao final;
- nao restaura por cima do banco de producao.

Tabelas criticas validadas:

```text
_prisma_migrations
User
Customer
Equipment
ServiceOrder
Accessory
Budget
BudgetItem
Part
StockMovement
ServiceOrderHistory
CompanySettings
```

## 8. Testar restore isolado manualmente

Use este procedimento quando quiser auditar manualmente um backup. Nao use o banco de producao como primeiro teste.

Windows PowerShell:

```powershell
$project = "techdesk-prod"
$backup = Resolve-Path .\backups\NOME.dump
$backupDir = Split-Path -Parent $backup
$backupName = Split-Path -Leaf $backup
$db = "techdesk_restore_check"

docker compose -p $project --env-file .env -f docker-compose.yml exec -T postgres createdb -U techdesk $db
docker run --rm `
  --network "${project}_default" `
  -v "${backupDir}:/backups" `
  -e PGPASSWORD="$(Select-String '^POSTGRES_PASSWORD=' .env | ForEach-Object { $_.Line.Split('=',2)[1] })" `
  postgres:16 pg_restore -h postgres -U techdesk -d $db "/backups/$backupName"
docker compose -p $project --env-file .env -f docker-compose.yml exec -T postgres psql -U techdesk -d $db -c 'select count(*) from "ServiceOrder";'
docker compose -p $project --env-file .env -f docker-compose.yml exec -T postgres dropdb -U techdesk $db
```

Linux:

```sh
project=techdesk-prod
backup="$(realpath ./backups/NOME.dump)"
backup_dir="$(dirname "$backup")"
backup_name="$(basename "$backup")"
db=techdesk_restore_check
pg_password="$(grep '^POSTGRES_PASSWORD=' .env | tail -n 1 | cut -d= -f2-)"

docker compose -p "$project" --env-file .env -f docker-compose.yml exec -T postgres createdb -U techdesk "$db"
docker run --rm \
  --network "${project}_default" \
  -v "${backup_dir}:/backups" \
  -e PGPASSWORD="$pg_password" \
  postgres:16 pg_restore -h postgres -U techdesk -d "$db" "/backups/$backup_name"
docker compose -p "$project" --env-file .env -f docker-compose.yml exec -T postgres psql -U techdesk -d "$db" -c 'select count(*) from "ServiceOrder";'
docker compose -p "$project" --env-file .env -f docker-compose.yml exec -T postgres dropdb -U techdesk "$db"
```

Se qualquer etapa falhar, trate o backup como suspeito ate investigar.

## 9. Restaurar o banco real

Use somente quando o banco atual estiver corrompido, perdido ou quando houver decisao tecnica explicita.

Antes de qualquer acao destrutiva:

1. Confirme que voce esta na pasta `deploy` correta.
2. Confirme o projeto em `.env`: `TECHDESK_PROJECT_NAME`.
3. Confirme o banco em `.env`: `POSTGRES_DB`.
4. Preserve o dump original.
5. Compare SHA256.
6. Rode `restore-check`.
7. Se o banco atual ainda abre, gere backup de emergencia.
8. Pare a API para impedir escrita durante restore.

Windows:

```powershell
.\stop.ps1
```

Linux:

```sh
./stop.sh
```

Depois suba somente o PostgreSQL:

Windows:

```powershell
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml up -d postgres
```

Linux:

```sh
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml up -d postgres
```

Se o banco atual ainda existe, crie backup de emergencia antes do restore:

```powershell
.\backup.ps1
```

Restore real conservador:

1. crie um banco novo com nome temporario;
2. restaure o dump nele;
3. valide contagens e relacoes;
4. somente depois substitua o banco operacional em janela de manutencao.

Politica recomendada para v1.1.0:

- nao restaurar diretamente com `--clean` sobre o banco em uso;
- preferir novo volume/banco e troca controlada;
- liberar a aplicacao somente apos smoke test.

Procedimento de promocao recomendado:

```text
techdesk
  -> renomear para techdesk_before_restore_YYYYMMDDHHMMSS
techdesk_restored_YYYYMMDDHHMMSS
  -> renomear para techdesk
```

Exemplo Windows PowerShell:

```powershell
$project = "techdesk-prod"
$dbUser = "techdesk"
$backup = Resolve-Path .\backups\NOME.dump
$backupName = Split-Path -Leaf $backup
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$restoredDb = "techdesk_restored_$stamp"
$oldDb = "techdesk_before_restore_$stamp"
$containerId = docker compose -p $project --env-file .env -f docker-compose.yml ps -q postgres

docker cp $backup "${containerId}:/tmp/$backupName"
docker compose -p $project --env-file .env -f docker-compose.yml exec -T postgres createdb -U $dbUser $restoredDb
docker compose -p $project --env-file .env -f docker-compose.yml exec -T postgres pg_restore -U $dbUser -d $restoredDb "/tmp/$backupName"
docker compose -p $project --env-file .env -f docker-compose.yml exec -T postgres psql -U $dbUser -d $restoredDb -c 'select count(*) from "ServiceOrder";'

docker compose -p $project --env-file .env -f docker-compose.yml exec -T postgres psql -U $dbUser -d postgres -c "ALTER DATABASE techdesk RENAME TO $oldDb;"
docker compose -p $project --env-file .env -f docker-compose.yml exec -T postgres psql -U $dbUser -d postgres -c "ALTER DATABASE $restoredDb RENAME TO techdesk;"
docker compose -p $project --env-file .env -f docker-compose.yml exec -T postgres rm -f "/tmp/$backupName"
```

Exemplo Linux:

```sh
project=techdesk-prod
db_user=techdesk
backup="$(realpath ./backups/NOME.dump)"
backup_name="$(basename "$backup")"
stamp="$(date +%Y%m%d%H%M%S)"
restored_db="techdesk_restored_${stamp}"
old_db="techdesk_before_restore_${stamp}"
container_id="$(docker compose -p "$project" --env-file .env -f docker-compose.yml ps -q postgres)"

docker cp "$backup" "${container_id}:/tmp/${backup_name}"
docker compose -p "$project" --env-file .env -f docker-compose.yml exec -T postgres createdb -U "$db_user" "$restored_db"
docker compose -p "$project" --env-file .env -f docker-compose.yml exec -T postgres pg_restore -U "$db_user" -d "$restored_db" "/tmp/${backup_name}"
docker compose -p "$project" --env-file .env -f docker-compose.yml exec -T postgres psql -U "$db_user" -d "$restored_db" -c 'select count(*) from "ServiceOrder";'

docker compose -p "$project" --env-file .env -f docker-compose.yml exec -T postgres psql -U "$db_user" -d postgres -c "ALTER DATABASE techdesk RENAME TO ${old_db};"
docker compose -p "$project" --env-file .env -f docker-compose.yml exec -T postgres psql -U "$db_user" -d postgres -c "ALTER DATABASE ${restored_db} RENAME TO techdesk;"
docker compose -p "$project" --env-file .env -f docker-compose.yml exec -T postgres rm -f "/tmp/${backup_name}"
```

Somente remova o banco `techdesk_before_restore_*` depois de validar o sistema recuperado e criar novo backup pos-restore.

## 10. Recuperar em maquina nova

Cenario: o computador/SSD original morreu.

Voce precisa ter:

- Docker instalado;
- installer TechDesk Pro v1.1.0 ou revisao de distribuicao aprovada;
- arquivo `.dump` validado;
- SHA256 registrado;
- copia segura do `.env` ou das variaveis operacionais;
- informacao de porta e acesso LAN.

Passos:

1. Instale Docker.
2. Extraia o installer em uma pasta nova.
3. Entre na pasta `deploy`.
4. Recrie o `.env`.
5. Use preferencialmente o mesmo `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD` da instalacao anterior.
6. Defina `JWT_SECRET`. Se trocar, usuarios precisarao fazer login novamente; os dados continuam preservados.
7. Ajuste `CORS_ORIGIN` para o IP/nome da nova maquina.
8. Suba somente o PostgreSQL.
9. Execute `restore-check` no backup.
10. Restaure o dump em banco isolado e valide.
11. Promova o banco restaurado para banco operacional.
12. Suba API e frontend.
13. Valide `/health` e `/api/ready`.
14. Faça login.
15. Valide clientes, equipamentos, OS, pecas, estoque, historicos e tracking publico.
16. Configure IP fixo ou reserva DHCP.
17. Execute um novo backup pos-recuperacao.

O installer cria um ADMIN inicial quando o banco esta vazio. Apos restore de backup existente, nao rode seed desnecessariamente: os usuarios do backup ja foram restaurados.

## 11. Migrations apos restore

Cenario A - backup da mesma versao:

- restaure usando o mesmo pacote/imagens da versao que criou o backup;
- o dump inclui `_prisma_migrations`;
- `prisma migrate deploy` nao deve recriar migrations ja aplicadas;
- nao rode seed para "corrigir" dados restaurados.

Cenario B - backup de versao anterior em instalacao mais nova:

- primeiro restaure em ambiente isolado usando a versao que criou o backup;
- valide dados e relacoes;
- faca backup novo desse ambiente restaurado;
- entao aplique a atualizacao seguindo o procedimento da versao nova.

Politica suportada para v1.1.0:

- o caminho mais seguro e restaurar primeiro na mesma versao do backup;
- atualizacao de versao vem depois do restore validado.

## 12. Secrets e configuracao

Preserve fora do Git:

- `.env` da instalacao;
- `POSTGRES_PASSWORD`;
- `DATABASE_URL`;
- `JWT_SECRET`;
- `TECHDESK_PORT`;
- `CORS_ORIGIN`;
- imagens Docker configuradas;
- qualquer regra operacional de firewall/rede.

Nunca coloque esses valores em README, issue publica, print de suporte ou commit.

Se `JWT_SECRET` for alterado em desastre, sessoes antigas deixam de valer. Isso normalmente e aceitavel e ate desejavel apos recuperacao. Os hashes de senha dos usuarios ficam no banco restaurado.

## 13. Verificacoes pos-restore

Depois de qualquer restore:

Windows:

```powershell
.\start.ps1
.\status.ps1
Invoke-WebRequest http://127.0.0.1:8080/health -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/api/ready -UseBasicParsing
```

Linux:

```sh
./start.sh
./status.sh
curl -fsS http://127.0.0.1:8080/health
curl -fsS http://127.0.0.1:8080/api/ready
```

Valide na aplicacao:

- login;
- `/me`;
- clientes;
- equipamentos;
- ordens de servico;
- orcamentos;
- pecas;
- estoque;
- historicos;
- configuracoes da empresa;
- tracking publico;
- acesso pela LAN.

## 14. Rollback se o restore falhar

Se o restore falhar:

1. Nao apague o dump original.
2. Nao repita comandos destrutivos sem entender o erro.
3. Guarde logs do PostgreSQL e da API.
4. Preserve qualquer backup de emergencia criado antes da tentativa.
5. Verifique SHA256 novamente.
6. Rode `pg_restore -l`.
7. Teste o dump em banco isolado.
8. Se o banco antigo ainda existe e foi preservado, volte a apontar a aplicacao para ele.
9. So tente novo restore depois de identificar a causa.

Logs:

```powershell
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml logs --tail 200 postgres
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml logs --tail 200 api
```

## 15. Politica de armazenamento

Politica minima:

- uma copia local para restore rapido;
- uma copia fora da maquina.

Opcoes:

- HD externo;
- NAS;
- outro computador da assistencia;
- servidor remoto;
- storage cloud.

Quando possivel, use regra 3-2-1:

- 3 copias dos dados;
- 2 tipos de midia;
- 1 copia fora do equipamento/local principal.

## 16. Retencao

Recomendacao inicial para assistencia pequena:

- backup diario ao final do expediente;
- manter pelo menos 14 backups diarios;
- manter 4 backups semanais;
- backup extra antes de atualizacao;
- backup extra antes de manutencao critica;
- testar restore isolado pelo menos uma vez por mes.

Ajuste a politica conforme volume de atendimentos e tolerancia a perda de dados.

## 17. Nunca faca

- Nunca use `docker compose down -v` em ambiente com dados importantes.
- Nunca apague o volume `techdesk_pgdata` sem backup validado.
- Nunca use `prisma migrate reset` em producao.
- Nunca restaure primeiro em producao sem testar o dump.
- Nunca edite o banco manualmente sem backup previo.
- Nunca versione `.env`, dumps, senhas ou tokens.
- Nunca substitua um backup antigo sem conferir que o novo backup e recuperavel.
- Nunca assuma que SHA256 correto prova que o restore funciona; ele prova integridade do arquivo, nao recuperacao completa.

## 18. Checklist rapido de emergencia

Use em incidente real:

```text
[ ] Pare e identifique a instalacao correta.
[ ] Preserve o dump original.
[ ] Compare SHA256.
[ ] Rode restore-check.
[ ] Se possivel, gere backup de emergencia do banco atual.
[ ] Pare API/frontend antes de restore real.
[ ] Restaure primeiro em banco isolado.
[ ] Valide tabelas, contagens e relacoes.
[ ] Promova o banco restaurado somente apos PASS.
[ ] Suba aplicacao.
[ ] Valide health e ready.
[ ] Faça login.
[ ] Confira dados principais.
[ ] Confira tracking publico.
[ ] Gere backup pos-recuperacao.
[ ] Copie o backup pos-recuperacao para fora da maquina.
```
