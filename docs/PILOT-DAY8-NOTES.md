# Dia 8 - Fechamento do piloto e Release Candidate v1.0.0

## Estado inicial

- Data/hora: 2026-08-15 00:37.
- Branch: `codex/openapi-tests-health-logs`.
- Commit base do Dia 8: `580dffd`.
- Observação: o commit aprovado do Dia 7 foi `84b3dd7`, seguido pelo hotfix documentado `580dffd` para observações históricas.
- Git status inicial: limpo.
- `/health` inicial: `ok`.
- `/ready` inicial: `ready`.
- Containers piloto iniciais: API e PostgreSQL `healthy`.
- Logs iniciais: sem `statusCode: 500`, `level: 50`, `Unhandled`, `Prisma error`, `panic` ou `Internal server error`.

## Backup pré-Dia 8

- Arquivo: `backups/pre-dia8-2026-08-15_00-37-54.dump`.
- Tamanho: 40707 bytes.
- SHA256: `F4E5C4330CF18A5FE7688195E45EBEDA6B1C09D1F223938EDDA84F3136188CC9`.
- Validação: `pg_restore -l` com exit code 0.

## Fotografia inicial do banco piloto

- Usuários: 6.
- Clientes: 21.
- Equipamentos: 20.
- OS: 21.
- Budgets: 13.
- Stock movements: 11.
- Históricos: 74.
- Peças: 4.
- Encoding do banco: servidor e cliente em UTF8.
- Migrations aplicadas: 12.
- `npx prisma migrate status`: banco atualizado, sem migrations pendentes.

## Auditoria de segurança operacional

- `npm audit --json` backend: 0 vulnerabilidades.
- `npm audit --json` frontend: 0 vulnerabilidades.
- `.env`, `.env.pilot`, `frontend/.env` e dumps não estão rastreados no Git.
- Busca por secrets/hardcodes não encontrou credenciais reais versionadas.
- Achados aceitos: placeholders em `.env.example`, URLs locais em testes/docs e `localhost` interno em healthchecks.
- Swagger passa a ficar desabilitado por padrão em produção.
- `CORS_ORIGIN` de exemplo foi ajustado para origem explícita, sem `*`.

## Ajustes para Release Candidate

- API mantém `SWAGGER_ENABLED=false` por padrão em `NODE_ENV=production`.
- `docker-compose.yml` ganhou serviço `frontend` com build estático e Nginx.
- Frontend passou a ter `frontend/Dockerfile`, `frontend/nginx.conf` e `.dockerignore`.
- Healthcheck do frontend usa `http://127.0.0.1/health` para evitar falso `unhealthy` interno.
- Scripts de backup passam a gerar dump customizado `.dump` com `pg_dump -Fc`, validar com `pg_restore -l`, calcular SHA256 e falhar em arquivo vazio.
- Backend e frontend estão versionados como `1.0.0`.
- Documentação criada/atualizada: `README.md`, `frontend/README.md`, `CHANGELOG.md`, `docs/RELEASE-CHECKLIST.md`, `docs/OPERATIONS-RUNBOOK.md`, `docs/POST-V1-BACKLOG.md`.

## Testes automatizados

- Backend `npm run typecheck`: passou.
- Backend `npm test`: passou, 1 arquivo, 13 testes.
- Backend `npm run build`: passou.
- Frontend `npm run lint`: passou.
- Frontend `npm test`: passou, 6 arquivos, 16 testes.
- Frontend `npm run build`: passou.
- Observação: Vite manteve aviso de chunk JS acima de 500 kB.

## Docker e stack RC

- Build da API: `docker build -t techdesk-api:rc-day8 .` passou.
- Build do frontend: `docker build --build-arg VITE_API_URL=http://localhost:3333 -t techdesk-frontend:rc-day8 .` passou.
- Stack RC criada com projeto isolado `techdesk-rc`, banco `techdesk_rc`, porta API `4333` e porta frontend `5180`.
- Containers RC finais: `techdesk-rc-api-1` healthy, `techdesk-rc-postgres-1` healthy, `techdesk-rc-frontend-1` healthy.
- `/health` RC: `ok`.
- `/ready` RC: `ready`.
- Frontend RC `/login`: HTTP 200.
- Fallback SPA RC: HTTP 200 em rota interna.
- Swagger RC em produção: `/docs` retornou 404.
- Seed RC idempotente: primeira execução criou o ADMIN; segunda execução manteve apenas 1 ADMIN para o login configurado.

## Smoke test RC

Fluxo validado por API em dados únicos:

- Login ADMIN.
- `/me` sem senha no payload.
- Dashboard respondeu.
- Atualização de configurações da empresa.
- Criação de usuários `TECHNICIAN` e `RECEPTION` com respostas seguras.
- Login dos dois papéis.
- RBAC: técnico e recepção receberam 403 em `/users`.
- Criação de peça.
- Entrada de estoque.
- Criação de cliente.
- Criação de equipamento.
- Abertura de OS.
- Mudança para análise.
- Registro de diagnóstico.
- Criação de orçamento V1.
- Mudança para aguardando aprovação.
- Técnico bloqueado ao tentar aprovar orçamento.
- Recepção aprovou orçamento.
- Mudança para manutenção.
- Consumo de peça vinculado à OS.
- Finalização.
- Aguardando retirada.
- Entrega.
- Detalhe privado contém orçamento, movimento de estoque e histórico.
- Consulta pública por token respondeu.
- Consulta pública não expôs campos sensíveis como senha, token público, acessórios, budgets ou movimentos de estoque.
- Token público inválido retornou 404.

Resultado final do smoke RC:

- OS entregue: `#3`.
- Contagem RC após smoke: usuários 11, clientes 4, equipamentos 4, OS 3, budgets 3, stock movements 8, históricos 21.

## Persistência RC

- Restart da API: `/ready` voltou 200 e contadores permaneceram `11|3|3|8` para usuários, OS, budgets e stock movements.
- Restart do PostgreSQL: `/ready` voltou 200 e contadores permaneceram `11|3|3|8`.
- `docker compose down` sem `-v`, seguido de `up -d`: `/ready` voltou 200 e contadores permaneceram `11|3|3|8`.
- Nenhum volume foi removido.

## Backup e restore RC

- Backup RC oficial via `scripts/backup.ps1`: `backups/techdesk-2026-08-15_00-56-28.dump`.
- Tamanho: 33430 bytes.
- SHA256: `24B46A55D69A87E55782721CAB88984082E5B784A0F88A4D0C0423B1AAAA5467`.
- Validação: `pg_restore -l` com exit code 0.
- Restore testado no banco isolado `techdesk_rc_restore_day8`.
- Contagem após restore: usuários 11, clientes 4, equipamentos 4, OS 3, budgets 3, stock movements 8, históricos 21.

## Estado final do piloto

- `/health` final: `ok`.
- `/ready` final: `ready`.
- Containers finais: `techdesk-pilot-api-1` healthy; `techdesk-pilot-postgres-1` healthy.
- Logs finais: sem `statusCode: 500`, `level: 50`, `Unhandled`, `Prisma error`, `panic` ou `Internal server error` nos últimos 1500 eventos da API.

## Fotografia final do banco piloto

- Usuários: 6.
- Clientes: 21.
- Equipamentos: 20.
- OS: 21.
- Budgets: 13.
- Stock movements: 11.
- Históricos: 74.
- Peças: 4.

## Backup pós-Dia 8

- Arquivo: `backups/post-dia8-2026-08-15_00-57-15.dump`.
- Tamanho: 40707 bytes.
- SHA256: `DCD46F85C28A7D1FC7824F5B0CE1C069A41C132D8D7163FC6DB67D7A2795BA0B`.
- Validação: `pg_restore -l` com exit code 0.

## Débitos aceitos para pós-v1

- Otimização do bundle do frontend: Vite alerta chunk acima de 500 kB.
- Estorno auditável de consumo de peça.
- CPF/CPF-CNPJ como identificação única de cliente.
- Eventual revisão futura de estratégia de armazenamento do JWT no frontend.

## Decisão final

- Resultado: RC APROVADA.
- Motivo: nenhum P0/P1 encontrado, testes automatizados passando, smoke operacional completo validado, RBAC preservado, produção Docker validada, migrations sem pendência, health/ready OK, logs limpos, backup e restore comprovados.
