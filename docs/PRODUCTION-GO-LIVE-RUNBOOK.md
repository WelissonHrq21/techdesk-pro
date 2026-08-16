# TechDesk Pro v1.0.0
# Production Deployment / Go-Live Runbook

Este runbook conduz o primeiro deploy real do TechDesk Pro em uma assistencia tecnica.

Use este documento no dia da implantacao, junto com o installer `techdesk-pro-v1.0.0-install-r2.zip` e o guia `deploy/README-BACKUP-RESTORE.md` incluido no pacote.

Este procedimento nao exige Node.js, npm, TypeScript, Prisma CLI ou Vite na maquina de producao.

## 1. Ficha do deploy

Preencher no local, sem registrar senhas, tokens ou secrets.

```text
Data:
Responsavel:
Empresa/assistencia:
Local:

Hostname servidor:
Sistema operacional:
IP servidor:
MAC servidor:
Gateway:
DNS:
Porta frontend:

Usuario ADMIN:
Local instalacao:
Local backup local:
Local backup externo:

Versao TechDesk: v1.0.0
Installer: techdesk-pro-v1.0.0-install-r2.zip
SHA256 installer: 9928EDA7CDDD11F495DA42DC9238B5440DBD3F400F6F343AD458007CD3A71438
API image: ghcr.io/welissonhrq21/techdesk-pro-api:1.0.0
Frontend image: ghcr.io/welissonhrq21/techdesk-pro-frontend:1.0.0
Compose project: techdesk-prod
```

## 2. Materiais para levar

[ ] Maquina/servidor definido para a instalacao.
[ ] Acesso administrativo ao servidor.
[ ] Acesso ao roteador/DHCP/firewall da rede local, se necessario.
[ ] Installer `techdesk-pro-v1.0.0-install-r2.zip`.
[ ] SHA256 esperado do installer.
[ ] Este runbook.
[ ] `deploy/README-INSTALL.md`.
[ ] `deploy/README-BACKUP-RESTORE.md`.
[ ] Destino de backup externo definido: `<LOCAL_BACKUP_EXTERNO>`.
[ ] Credenciais temporarias combinadas com o responsavel autorizado, sem anotar no runbook.

## 3. Hardware

As recomendacoes abaixo sao operacionais para uma assistencia pequena. Elas nao substituem benchmark formal.

### Minimo

[ ] CPU: 2 cores x86_64.
[ ] RAM: 4 GB.
[ ] SSD: 64 GB.
[ ] Espaco livre antes da instalacao: pelo menos 20 GB.
[ ] Rede: Ethernet ou Wi-Fi estavel na LAN.
[ ] Backup externo: HD externo, NAS, outro computador ou storage remoto seguro.

### Recomendado

[ ] CPU: 4 cores x86_64.
[ ] RAM: 8 GB.
[ ] SSD: 120 GB ou maior.
[ ] Espaco livre antes da instalacao: 50 GB ou mais.
[ ] Rede: Ethernet cabeada.
[ ] Energia: nobreak quando possivel.
[ ] Backup externo: destino fixo com rotina diaria.

## 4. Sistema operacional recomendado

Plataforma preferencial: Ubuntu Server LTS suportado pelo Docker Engine.

Usar uma versao LTS atual e suportada. No dia da instalacao, confirmar compatibilidade no guia oficial do Docker:

```text
https://docs.docker.com/engine/install/ubuntu/
```

Checklist inicial:

[ ] Ubuntu Server LTS instalado.
[ ] Usuario administrativo criado.
[ ] Hostname definido.
[ ] Timezone correto.
[ ] Relogio/NTP funcionando.
[ ] Sistema atualizado.
[ ] `curl`, `unzip` e certificados CA disponiveis.
[ ] Servidor reiniciado apos atualizacoes importantes.

Comandos sugeridos:

```sh
hostnamectl
timedatectl
sudo timedatectl set-timezone America/Fortaleza
sudo apt update
sudo apt install ca-certificates curl unzip
sudo apt upgrade
sudo reboot
```

Depois do reboot:

```sh
hostnamectl
timedatectl
```

## 5. Docker

Instalar Docker Engine e Docker Compose seguindo a documentacao oficial do Docker para Ubuntu.

Checklist:

[ ] Docker Engine instalado.
[ ] Docker daemon ativo.
[ ] Docker habilitado no boot.
[ ] Docker Compose disponivel.
[ ] `hello-world` funcionando.
[ ] Usuario operacional autorizado a usar Docker, se essa politica for adotada.

Diagnostico:

```sh
docker --version
docker compose version
sudo systemctl status docker --no-pager
sudo systemctl enable docker
sudo docker run --rm hello-world
```

Se o usuario for adicionado ao grupo `docker`, encerrar sessao e entrar novamente antes de continuar:

```sh
sudo usermod -aG docker "$USER"
```

Validar sem `sudo` somente apos nova sessao:

```sh
docker info
```

Se `docker info` falhar, resolver Docker antes de instalar o TechDesk.

## 6. Preparar diretorio de producao

Diretorio recomendado:

```text
/opt/techdesk-pro
```

Checklist:

[ ] Diretorio criado.
[ ] Owner definido para o usuario operacional.
[ ] Permissoes impedem escrita por usuarios nao autorizados.
[ ] Installer copiado para o servidor.
[ ] Backup local definido em `/opt/techdesk-pro/deploy/backups` ou outro local documentado.

Comandos:

```sh
sudo mkdir -p /opt/techdesk-pro
sudo chown "$USER":"$USER" /opt/techdesk-pro
chmod 750 /opt/techdesk-pro
cd /opt/techdesk-pro
```

## 7. Obter e validar o installer

Installer recomendado:

```text
techdesk-pro-v1.0.0-install-r2.zip
```

SHA256 esperado:

```text
9928EDA7CDDD11F495DA42DC9238B5440DBD3F400F6F343AD458007CD3A71438
```

Baixar ou copiar o arquivo para `/opt/techdesk-pro`.

Opcional, se houver acesso a internet no servidor:

```sh
cd /opt/techdesk-pro
curl -fL -o techdesk-pro-v1.0.0-install-r2.zip \
  https://github.com/WelissonHrq21/techdesk-pro/releases/download/v1.0.0/techdesk-pro-v1.0.0-install-r2.zip
```

Validar antes de extrair:

```sh
cd /opt/techdesk-pro
sha256sum techdesk-pro-v1.0.0-install-r2.zip
```

[ ] SHA256 calculado.
[ ] SHA256 confere exatamente com o esperado.

Se divergir:

```text
STOP. Nao instalar. Obter novamente o installer por uma fonte confiavel.
```

Extrair:

```sh
cd /opt/techdesk-pro
unzip techdesk-pro-v1.0.0-install-r2.zip
cd /opt/techdesk-pro/deploy
chmod +x *.sh
ls -la
```

Arquivos esperados:

[ ] `docker-compose.yml`.
[ ] `.env.example`.
[ ] `install.sh`.
[ ] `start.sh`.
[ ] `stop.sh`.
[ ] `restart.sh`.
[ ] `status.sh`.
[ ] `backup.sh`.
[ ] `restore-check.sh`.
[ ] `README-INSTALL.md`.
[ ] `README-BACKUP-RESTORE.md`.
[ ] `nginx/default.conf`.

## 8. Configuracao de producao

O script `./install.sh` cria o `.env`, gera `POSTGRES_PASSWORD`, gera `JWT_SECRET`, configura imagens oficiais e solicita os dados do ADMIN inicial.

Nao registrar secrets no runbook.

Antes de rodar o instalador, definir:

[ ] Porta frontend: `<PORTA>`.
[ ] Nome do ADMIN inicial: `<NOME_ADMIN>`.
[ ] Login do ADMIN inicial: `<USUARIO_ADMIN>`.
[ ] Senha temporaria forte entregue somente ao responsavel autorizado.
[ ] IP/hostname esperado do servidor na LAN.

Depois do instalador:

[ ] `.env` existe.
[ ] `.env` nao foi copiado para Git, chat, email publico ou pasta compartilhada sem controle.
[ ] `.env` com permissao restrita.
[ ] `SWAGGER_ENABLED=false`.
[ ] `TECHDESK_API_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-api:1.0.0`.
[ ] `TECHDESK_FRONTEND_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-frontend:1.0.0`.

Conferir sem imprimir secrets completos:

```sh
cd /opt/techdesk-pro/deploy
ls -l .env
grep '^TECHDESK_PORT=' .env
grep '^TECHDESK_PROJECT_NAME=' .env
grep '^POSTGRES_DB=' .env
grep '^POSTGRES_USER=' .env
grep '^SWAGGER_ENABLED=' .env
grep '^TECHDESK_API_IMAGE=' .env
grep '^TECHDESK_FRONTEND_IMAGE=' .env
chmod 600 .env
```

## 9. Primeiro start

Executar instalacao:

```sh
cd /opt/techdesk-pro/deploy
./install.sh
```

O instalador deve:

[ ] Validar Docker.
[ ] Validar espaco livre minimo.
[ ] Criar ou preservar `.env`.
[ ] Validar `docker compose config`.
[ ] Fazer pull das imagens.
[ ] Subir `postgres`, `api` e `frontend`.
[ ] Executar migrations no startup da API.
[ ] Executar seed ADMIN idempotente.
[ ] Aguardar health/ready.
[ ] Mostrar URLs possiveis.

Esperado para v1.0.0:

[ ] 12 migrations aplicadas ou ja presentes.
[ ] `postgres` healthy.
[ ] `api` healthy.
[ ] `frontend` running/healthy.
[ ] `/health` retorna `ok`.
[ ] `/api/ready` retorna ready/HTTP 200.
[ ] Frontend abre no navegador.

Comandos de verificacao:

```sh
cd /opt/techdesk-pro/deploy
./status.sh
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml ps
curl -fsS http://127.0.0.1:<PORTA>/health
curl -fsS http://127.0.0.1:<PORTA>/api/ready
```

Substituir `<PORTA>` pela porta definida no instalador.

## 10. Rede local

O TechDesk Pro publica somente o frontend/Nginx na porta `TECHDESK_PORT`. A API fica acessivel via same-origin em `/api`. O PostgreSQL nao deve ser exposto na LAN.

Checklist LAN:

[ ] IP do servidor identificado: `<IP_DO_SERVIDOR>`.
[ ] MAC do servidor registrado.
[ ] Gateway registrado.
[ ] DNS registrado.
[ ] Porta frontend registrada: `<PORTA>`.
[ ] Reserva DHCP configurada no roteador, preferencialmente.
[ ] Se reserva DHCP nao for possivel, IP estatico configurado com cuidado.
[ ] Acesso pelo proprio servidor testado.
[ ] Acesso por outro PC da LAN testado.

Descobrir IP/MAC:

```sh
ip addr
ip route
hostname -I
```

URL de acesso:

```text
http://<IP_DO_SERVIDOR>:<PORTA>
```

Se o IP mudar, atualizar `CORS_ORIGIN` no `.env` e reiniciar:

```sh
cd /opt/techdesk-pro/deploy
./restart.sh
```

## 11. Firewall

Principio: abrir somente o necessario.

[ ] Porta frontend `<PORTA>` permitida na LAN.
[ ] PostgreSQL nao publicado no `docker-compose.yml`.
[ ] API nao publicada diretamente em porta externa.
[ ] Acesso externo pela LAN testado.
[ ] Firewall global nao foi desativado sem necessidade.

Exemplo com UFW, se usado no servidor:

```sh
sudo ufw status verbose
sudo ufw allow from <REDE_LOCAL_CIDR> to any port <PORTA> proto tcp
sudo ufw status numbered
```

Exemplo de `<REDE_LOCAL_CIDR>`:

```text
192.168.0.0/24
10.0.0.0/24
```

Usar a rede real da assistencia. Nao copiar exemplos cegamente.

## 12. Testes em outros dispositivos

Validar:

[ ] Servidor: `http://127.0.0.1:<PORTA>`.
[ ] PC recepcao: `http://<IP_DO_SERVIDOR>:<PORTA>`.
[ ] PC tecnico: `http://<IP_DO_SERVIDOR>:<PORTA>`.
[ ] Celular na mesma rede, se disponivel: `http://<IP_DO_SERVIDOR>:<PORTA>`.

Em cada dispositivo:

[ ] Frontend carrega.
[ ] Login funciona.
[ ] Dashboard carrega.
[ ] Chamadas `/api` funcionam pelo mesmo host/porta.
[ ] Tracking publico abre sem login.

## 13. ADMIN inicial

Checklist:

[ ] ADMIN criado pelo instalador.
[ ] Login ADMIN testado.
[ ] Senha temporaria alterada pelo responsavel autorizado, quando aplicavel.
[ ] Credencial entregue somente ao responsavel autorizado.
[ ] Nenhuma senha registrada no runbook.
[ ] Conta ADMIN nao sera compartilhada no uso diario.

Depois do primeiro login:

[ ] Configuracoes da empresa preenchidas.
[ ] Usuarios reais criados.
[ ] Senha temporaria armazenada conforme politica da assistencia ou descartada apos troca.

## 14. Usuarios reais e RBAC

Criar contas individuais:

[ ] Pelo menos um `ADMIN` real.
[ ] Pelo menos um `RECEPTION` real.
[ ] Pelo menos um `TECHNICIAN` real.

Orientacoes:

[ ] Cada funcionario usa sua propria conta.
[ ] Nao compartilhar ADMIN.
[ ] Aplicar menor privilegio.
[ ] Desativar usuario quando funcionario sair ou nao precisar mais.

Teste de permissoes:

[ ] ADMIN acessa usuarios/configuracoes/pecas.
[ ] RECEPTION executa cliente/equipamento/abertura/aprovacao/retirada/entrega.
[ ] TECHNICIAN executa analise/diagnostico/orcamento/manutencao.
[ ] RECEPTION nao acessa gestao de usuarios.
[ ] TECHNICIAN nao acessa gestao de usuarios.

## 15. Smoke test de producao

Antes do GO-LIVE, criar um atendimento TESTE claramente identificado.

Usar nomes como:

```text
Cliente TESTE GO-LIVE
Equipamento TESTE GO-LIVE
OS TESTE GO-LIVE
Peca TESTE GO-LIVE
```

Checklist do fluxo:

[ ] Criar cliente teste.
[ ] Criar equipamento teste.
[ ] Criar peca teste, se for validar estoque.
[ ] Criar entrada de estoque da peca teste, se aplicavel.
[ ] Abrir OS teste.
[ ] Tecnico inicia analise.
[ ] Tecnico registra diagnostico.
[ ] Tecnico cria orcamento.
[ ] Recepcao aprova orcamento.
[ ] Tecnico coloca em manutencao.
[ ] Tecnico consome peca, se aplicavel.
[ ] Tecnico finaliza.
[ ] Recepcao marca aguardando retirada.
[ ] Recepcao marca entregue.
[ ] OS chega a `DELIVERED`, se o fluxo completo for seguro no contexto.

Nao limpar dados com SQL manual. Se os dados de teste permanecerem, deixa-los claramente identificados.

## 16. Impressao

Validar em PC real da recepcao ou maquina que fara impressao.

[ ] Protocolo/OS abre para impressao.
[ ] Orcamento abre para impressao.
[ ] Navegador configurado.
[ ] Impressora configurada no PC cliente.
[ ] Layout legivel.
[ ] Empresa correta.
[ ] Cliente correto.
[ ] Equipamento correto.
[ ] Valores corretos.
[ ] Nenhuma senha exposta.

Nao presumir modelo especifico de impressora.

## 17. Tracking publico

Checklist:

[ ] Link/token valido abre sem login.
[ ] Token invalido retorna 404.
[ ] Payload exibido e limitado ao cliente.
[ ] Nenhuma senha exibida.
[ ] Nenhuma informacao interna indevida exibida.
[ ] Nenhum usuario interno exibido.
[ ] Nenhum estoque exibido.
[ ] Acesso funciona por outro dispositivo na LAN.
[ ] Se houver link/QR impresso, validar leitura no dispositivo real.

## 18. Backup antes do GO-LIVE

Mesmo em instalacao nova, criar backup de referencia apos configuracao, usuarios e smoke test.

Usar `deploy/README-BACKUP-RESTORE.md` como guia oficial.

Comandos:

```sh
cd /opt/techdesk-pro/deploy
./backup.sh
```

Checklist:

[ ] Backup criado.
[ ] Tamanho conferido.
[ ] SHA256 calculado e registrado fora do arquivo.
[ ] `pg_restore -l` validado pelo script.
[ ] Copia local preservada.
[ ] Copia externa realizada para `<LOCAL_BACKUP_EXTERNO>`.
[ ] Copia externa acessivel.
[ ] SHA256 da copia externa confere.

Validar restore isolado:

```sh
cd /opt/techdesk-pro/deploy
./restore-check.sh ./backups/<ARQUIVO_BACKUP>.dump <SHA256_DO_BACKUP>
```

## 19. Backup automatico

O produto v1.0.0 nao possui automacao oficial de backup embutida na aplicacao.

Configuracao operacional minima:

[ ] Responsavel pelo backup definido.
[ ] Horario diario definido.
[ ] Destino local definido.
[ ] Destino externo definido.
[ ] Restore-check mensal definido.

Opcao manual obrigatoria ate automacao ser criada:

```sh
cd /opt/techdesk-pro/deploy
./backup.sh
```

Opcao operacional com cron, se a assistencia aceitar e o tecnico configurar conscientemente:

```sh
crontab -e
```

Exemplo conceitual para backup diario as 19:00:

```cron
0 19 * * * cd /opt/techdesk-pro/deploy && ./backup.sh >> /opt/techdesk-pro/deploy/logs/backup.log 2>&1
```

Antes de usar cron:

[ ] Criar pasta `logs`.
[ ] Garantir permissao de escrita.
[ ] Testar comando manualmente.
[ ] Confirmar que o backup gerado sera copiado para fora da maquina.

```sh
mkdir -p /opt/techdesk-pro/deploy/logs
```

Nao considerar cron configurado como substituto para copia externa e restore-check.

## 20. Backup externo

Obrigatorio antes do GO-LIVE:

```text
<LOCAL_BACKUP_EXTERNO>
```

Opcoes aceitaveis:

[ ] NAS.
[ ] HD externo.
[ ] Outro computador da assistencia.
[ ] Storage remoto seguro.

Checklist:

[ ] Destino definido.
[ ] Responsavel pelo destino definido.
[ ] Copia realizada.
[ ] Arquivo acessivel no destino.
[ ] SHA256 conferido no destino.
[ ] Politica de retencao definida.

Recomendacao inicial:

[ ] Backup diario ao final do expediente.
[ ] Manter pelo menos 14 backups diarios.
[ ] Manter 4 backups semanais.
[ ] Backup extra antes de atualizacao.
[ ] Restore-check mensal.

## 21. Teste de reboot real

Antes do GO-LIVE, reiniciar o servidor real.

```sh
sudo reboot
```

Depois que o servidor voltar:

[ ] Docker iniciou.
[ ] Containers iniciaram automaticamente.
[ ] `postgres` healthy.
[ ] `api` healthy.
[ ] `frontend` disponivel.
[ ] `/health` OK.
[ ] `/api/ready` OK.
[ ] Login funciona.
[ ] Dados permanecem.

Comandos:

```sh
cd /opt/techdesk-pro/deploy
./status.sh
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml ps
curl -fsS http://127.0.0.1:<PORTA>/health
curl -fsS http://127.0.0.1:<PORTA>/api/ready
```

## 22. Persistencia

Apos reboot real, confirmar que os dados do smoke test permanecem.

[ ] Users.
[ ] Customers.
[ ] Equipment.
[ ] ServiceOrders.
[ ] Parts.
[ ] StockMovements.
[ ] History.
[ ] CompanySettings.

Nao executar:

```text
docker compose down -v
```

## 23. Logs

Antes de liberar uso real:

```sh
cd /opt/techdesk-pro/deploy
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml logs --tail 300 api
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml logs --tail 300 postgres
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml logs --tail 300 frontend
```

Procurar:

[ ] `500`.
[ ] `Unhandled`.
[ ] `Prisma error`.
[ ] `panic`.
[ ] `connection refused`.
[ ] `migration failure`.
[ ] `restart loop`.
[ ] `fatal`.

Diferenciar erros esperados de testes, como login incorreto, de falhas reais.

## 24. Seguranca pre-GO-LIVE

Checklist:

[ ] Swagger indisponivel em producao.
[ ] PostgreSQL nao exposto.
[ ] API nao exposta diretamente.
[ ] `.env` protegido com permissao restrita.
[ ] Secrets fortes.
[ ] ADMIN nao compartilhado.
[ ] `CORS_ORIGIN` adequado aos acessos reais.
[ ] Dumps fora do frontend e fora de pastas publicas.
[ ] Nenhum secret nos logs.
[ ] Containers saudaveis.
[ ] Firewall adequado.
[ ] Backup externo feito.

Testar Swagger desativado:

```sh
curl -i http://127.0.0.1:<PORTA>/api/docs
```

Esperado: 404 ou indisponivel.

## 25. Criterios GO / NO-GO

GO-LIVE autorizado somente se checklist critico passar.

### P0 - NO-GO

[ ] Perda ou corrupcao de dados.
[ ] Banco nao persiste apos reboot.
[ ] Backup nao pode ser criado.
[ ] Restore-check falha para o backup inicial.
[ ] Login ADMIN falha.
[ ] Migrations falham.
[ ] Containers em crash loop.
[ ] Exposicao critica de seguranca.

### P1 - NO-GO

[ ] Acesso LAN necessario nao funciona.
[ ] RBAC critico falha.
[ ] Tracking publico vaza dados indevidos.
[ ] PostgreSQL exposto na rede.
[ ] Health/ready nao ficam OK.
[ ] Impressao essencial da operacao nao funciona e nao ha contingencia aceita.

### P2 - avaliar antes de GO

[ ] Problema operacional com workaround seguro.
[ ] Alerta em logs sem impacto confirmado.
[ ] Ajuste de rede ou impressao pendente mas contornavel.

### P3 - backlog

[ ] Melhoria de UX.
[ ] Otimizacao nao bloqueante.
[ ] Automacao futura de backup.

## 26. GO-LIVE

GO-LIVE autorizado somente se checklist critico passar.

Registrar:

```text
Data/hora:
Responsavel:
Versao:
Installer SHA:
Backup inicial:
IP:
Status:
```

Decisao:

[ ] GO
[ ] GO COM RESTRICOES
[ ] NO-GO

Se `GO COM RESTRICOES`, registrar claramente as restricoes e o responsavel por resolve-las.

## 27. Primeiras 24 horas

[ ] Observar logs no inicio e fim do expediente.
[ ] Verificar espaco em disco.
[ ] Confirmar backup do dia.
[ ] Confirmar copia externa do backup.
[ ] Perguntar a recepcao sobre dificuldades.
[ ] Perguntar ao tecnico sobre dificuldades.
[ ] Registrar bugs ou melhorias.
[ ] Classificar problemas como P0/P1/P2/P3.
[ ] Nao alterar banco manualmente.
[ ] Nao remover volumes.

Comandos uteis:

```sh
df -h
cd /opt/techdesk-pro/deploy
./status.sh
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml logs --tail 200 api
```

## 28. Primeira semana

[ ] Conferir crescimento de disco.
[ ] Conferir backups diarios.
[ ] Executar pelo menos um `restore-check` em backup recente.
[ ] Revisar usuarios ativos.
[ ] Conferir estoque.
[ ] Conferir historicos de OS.
[ ] Conferir logs.
[ ] Registrar feedback da recepcao.
[ ] Registrar feedback tecnico.
[ ] Registrar incidentes.
[ ] Separar backlog para v1.1.0.

## 29. Emergencia

Resposta rapida. Nao executar comandos destrutivos simplificados.

### Sistema nao abre

Verificar:

```sh
cd /opt/techdesk-pro/deploy
./status.sh
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml ps
```

Nao fazer:

- nao usar `docker compose down -v`;
- nao reinstalar por cima sem backup;
- nao apagar volume.

Consultar:

- `deploy/README-INSTALL.md`;
- logs do frontend/API.

### Sistema abre, mas API nao responde

Verificar:

```sh
curl -i http://127.0.0.1:<PORTA>/api/ready
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml logs --tail 200 api
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml logs --tail 200 postgres
```

Nao fazer:

- nao alterar `DATABASE_URL` sem entender;
- nao rodar migration reset.

### PostgreSQL nao fica healthy

Verificar:

```sh
docker compose -p techdesk-prod --env-file .env -f docker-compose.yml logs --tail 200 postgres
df -h
```

Nao fazer:

- nao apagar `techdesk_pgdata`;
- nao recriar volume;
- nao executar restore sem backup validado.

Consultar:

- `deploy/README-BACKUP-RESTORE.md`.

### Disco cheio

Verificar:

```sh
df -h
docker system df
du -h -d 2 /opt/techdesk-pro 2>/dev/null | sort -h
```

Nao fazer:

- nao apagar backups sem confirmar copia externa;
- nao apagar volume do PostgreSQL;
- nao limpar dados do banco manualmente.

### Servidor nao liga

Verificar:

[ ] Energia.
[ ] Nobreak.
[ ] Fonte.
[ ] Disco.
[ ] Possibilidade de recuperar ultimo backup externo.

Consultar:

- secao de disaster recovery em `deploy/README-BACKUP-RESTORE.md`.

### Banco corrompido/perdido

Primeiro:

[ ] Parar e preservar evidencias.
[ ] Identificar ultimo backup valido.
[ ] Validar SHA256.
[ ] Rodar restore-check em ambiente seguro.

Consultar:

- `deploy/README-BACKUP-RESTORE.md`.

Nao fazer:

- nao restaurar primeiro por cima de producao;
- nao apagar dump original;
- nao repetir comandos destrutivos.

### Backup precisa ser restaurado

Usar:

```text
deploy/README-BACKUP-RESTORE.md
```

Regras:

[ ] Primeiro restore isolado.
[ ] Depois restore real conservador.
[ ] API parada durante troca.
[ ] Backup antigo preservado.
[ ] Smoke test apos restore.

## 30. Rollback de implantacao

Se o TechDesk ainda nao entrou em uso real:

[ ] Interromper implantacao.
[ ] Corrigir Docker/rede/env.
[ ] Repetir checks antes de GO.

Se ja houver dados reais:

[ ] Criar backup antes de qualquer intervencao.
[ ] Validar backup.
[ ] Nao recriar volumes.
[ ] Nao apagar banco.
[ ] Nao reinstalar cegamente.
[ ] Consultar `deploy/README-BACKUP-RESTORE.md`.

Rollback de aplicacao nao deve fingir rollback de banco. Banco so deve ser restaurado com decisao explicita e backup validado.

## 31. GO-LIVE SIGN-OFF

```text
Versao:
Data:
Responsavel:
Servidor:
IP:
Installer:
SHA256:
API image:
Frontend image:
Backup inicial:
Backup externo:
Restore-check:
Reboot:
LAN:
RBAC:
Tracking:
Impressao:
Logs:
Seguranca:

Problemas conhecidos:

P0:
P1:
P2:
P3:

Decisao:
[ ] GO
[ ] GO COM RESTRICOES
[ ] NO-GO

Observacoes:
```

## 32. Checklist final consolidado

[ ] Hardware suficiente.
[ ] Ubuntu Server LTS pronto.
[ ] Docker instalado e validado.
[ ] Installer SHA256 validado.
[ ] Instalacao em `/opt/techdesk-pro`.
[ ] `.env` criado pelo instalador e protegido.
[ ] 12 migrations aplicadas ou ja presentes.
[ ] ADMIN inicial criado.
[ ] Senha/credencial tratada sem exposicao.
[ ] Usuarios reais criados.
[ ] RBAC testado.
[ ] Empresa configurada.
[ ] LAN testada.
[ ] Firewall revisado.
[ ] Smoke test executado.
[ ] Impressao validada.
[ ] Tracking publico validado.
[ ] Backup inicial criado.
[ ] Restore-check executado.
[ ] Backup externo copiado e conferido.
[ ] Reboot real executado.
[ ] Persistencia confirmada.
[ ] Logs revisados.
[ ] Criterios GO/NO-GO avaliados.
[ ] Sign-off preenchido.
