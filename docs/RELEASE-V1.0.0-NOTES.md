# Release v1.0.0 - TechDesk Pro

## Estado da RC

- Data/hora da validação final: 2026-08-15 01:07-01:24.
- Branch: `codex/openapi-tests-health-logs`.
- HEAD inicial esperado: `c0031fb0f6d9dff4583a78f1fe8fa688c6d06809`.
- HEAD inicial encontrado: `c0031fb0f6d9dff4583a78f1fe8fa688c6d06809`.
- Working tree inicial: limpo.
- Últimos commits no início:
  - `c0031fb chore: prepare TechDesk Pro v1.0.0 release candidate`
  - `580dffd docs: record day 7 history observation hotfix`
  - `6f4d3e8 fix: pilot notes`
  - `84b3dd7 fix: address pilot UX and encoding issues`
  - `f1dcabd fix(frontend): modfired gitignore and created pilot-notes.md`

## Backup pré-release

- Arquivo: `backups/pre-v1.0.0-2026-08-15_01-07-14.dump`.
- Tamanho: 40707 bytes.
- SHA256: `C214D43F583EA933B11CFEB50F250DD9FFA3FD1AEC4F416A86973E59BC06DCDD`.
- Validação: `pg_restore -l` com exit code 0.

## Banco de produção

- Decisão recomendada: Opção B, começar produção com base limpa.
- Motivo: o banco piloto contém dados de teste/piloto e deve ser preservado como evidência, não promovido automaticamente para produção real.
- Procedimento aprovado para base limpa:
  - novo banco/volume;
  - `prisma migrate deploy`;
  - seed inicial;
  - configurar CompanySettings;
  - criar usuários reais;
  - iniciar operação.
- Não executar em produção: `prisma migrate reset`, remoção de volume ou limpeza automática do banco piloto.

## Baseline final do piloto

- `/health`: `ok`.
- `/ready`: `ready`.
- Containers piloto: API e PostgreSQL `healthy`.
- Logs piloto: sem `statusCode: 500`, `level: 50`, `Unhandled`, `Prisma error`, `panic` ou `Internal server error`.
- Fotografia do banco piloto: usuários 6, clientes 21, equipamentos 20, OS 21, budgets 13, stock movements 11, históricos 74, peças 4.
- Migrations locais: 12 encontradas, sem pendência.

## Arquivos e secrets

- Não versionados: `.env`, `.env.pilot`, `frontend/.env`, dumps e backups reais.
- `backups/` permanece ignorado.
- Busca por padrões sensíveis encontrou apenas placeholders, variáveis de ambiente, fixtures de teste e documentação.
- Nenhum JWT, senha real, token ou dump real foi versionado.

## Versão

- Backend `package.json`: `1.0.0`.
- Backend `package-lock.json`: `1.0.0`.
- Frontend `package.json`: `1.0.0`.
- Frontend `package-lock.json`: `1.0.0`.
- Versão do produto: TechDesk Pro v1.0.0.

## Ajustes de release final

- `CHANGELOG.md` atualizado de Release Candidate para release final `1.0.0 - 2026-08-15`.
- `docs/POST-V1-BACKLOG.md` atualizado com política SemVer e estratégia mínima de branches/tags.
- Backend recebeu `postinstall: prisma generate` para `npm ci` limpo gerar Prisma Client antes de typecheck/build.
- `Dockerfile` ajustado para disponibilizar `prisma/`, `prisma.config.ts` e `DATABASE_URL` dummy antes dos `npm ci` das stages.

## Testes backend finais

- `npm ci`: passou, com `postinstall` gerando Prisma Client.
- `npm run typecheck`: passou.
- `npm test`: passou, 1 arquivo, 13 testes.
- `npm run build`: passou.

## Testes frontend finais

- `npm ci`: passou.
- `npm run lint`: passou.
- `npm test`: passou, 6 arquivos, 16 testes.
- `npm run build`: passou.
- Observação aceita: chunk Vite acima de 500 kB permanece tech debt pós-v1.

## npm audit

- Backend: 0 critical, 0 high, 0 moderate, 0 low.
- Frontend: 0 critical, 0 high, 0 moderate, 0 low.
- Nenhum `npm audit fix --force` executado.

## Docker build

- Backend: `docker build -t techdesk-pro-api:1.0.0 .` passou.
- Frontend: `docker build --build-arg VITE_API_URL=http://127.0.0.1:4334 -t techdesk-pro-frontend:1.0.0 ./frontend` passou.
- Stack Compose final também construiu imagens próprias para o projeto isolado.

## Stack final isolada

- Projeto Compose: `techdesk-v1-final`.
- Banco: `techdesk_v1_final`.
- Portas: API `4334`, frontend `5181`.
- Volume novo criado: `techdesk-v1-final_techdesk_pgdata`.
- Banco antes das migrations: 0 tabelas públicas.
- Containers finais: PostgreSQL `healthy`, API `healthy`, frontend `healthy`.
- `/health`: `ok`.
- `/ready`: `ready`.
- Frontend `/health`: respondeu.

## Instalação limpa e migrations

- PostgreSQL iniciou em volume novo.
- API executou `prisma migrate deploy` no startup.
- Migrations aplicadas: 12.
- Tabelas públicas após migrations: 12.
- API iniciou corretamente após migrations.

## Seed final

- Primeira execução: criou o ADMIN inicial.
- Segunda execução: informou que o ADMIN já existia.
- Contagem final para login `admin-v1`: 1 ADMIN ativo.
- Seed não sobrescreveu admin existente.
- Logs após seed: sem senha, JWT secret, password do PostgreSQL, Authorization ou Bearer token.

## Smoke final v1

- ADMIN: login, `/me`, dashboard, CompanySettings, criação de RECEPTION e TECHNICIAN.
- RECEPTION: login, criação de cliente, criação de equipamento e abertura de OS.
- TECHNICIAN: início de análise, diagnóstico, orçamento V1 e envio para aprovação.
- RECEPTION: aprovação do orçamento.
- TECHNICIAN: início de manutenção, consumo de peça e finalização.
- RECEPTION: aguardando retirada e entrega.
- Status final: `DELIVERED`.
- Orçamento V1 preservou total `250`.
- Movimento de estoque de consumo criado como `EXIT`.
- Contagem após smoke: usuários 3, clientes 1, equipamentos 1, OS 1, budgets 1, stock movements 2, históricos 7, peças 1.

## RBAC final

- Sem token -> 401.
- Token inválido -> 401.
- RECEPTION em `/users` -> 403.
- TECHNICIAN em `/users` -> 403.
- RECEPTION iniciar análise -> 403.
- TECHNICIAN aprovar orçamento -> 403.
- TECHNICIAN entregar OS -> 403.
- TECHNICIAN saída manual de estoque -> 403.
- Operações permitidas por papel passaram no smoke.

## Tracking público

- `/public/service-orders/:token` funcionou sem login.
- Token inválido retornou 404.
- Payload público não expôs senha, publicToken, accessories, budgets, stock movements, usuários internos ou diagnóstico.
- Frontend `/track/:token` carregou sem login.
- Observação: o tracking público não exibe nome do cliente, o que é aceito por privacidade e contrato público limitado.

## Impressão final

- Protocolo da OS renderizado no frontend autenticado.
- Orçamento V1 renderizado no frontend autenticado.
- Conferidos: CompanySettings, cliente, equipamento, número da OS, versão do orçamento e valores.
- Senha do equipamento não apareceu nas páginas de impressão.
- Rotas de impressão são servidas pelo fallback SPA do Nginx.

## Frontend SPA final

URLs acessadas diretamente via Nginx, todas HTTP 200 com fallback para `index.html`:

- `/login`.
- `/dashboard`.
- `/customers`.
- `/service-orders`.
- `/parts`.
- `/settings`.
- `/track/<token>`.
- `/service-orders/<id>/print`.
- `/service-orders/<id>/budgets/<budgetId>/print`.

## CORS e Swagger

- Origem permitida `http://127.0.0.1:5181`: recebeu `Access-Control-Allow-Origin` explícito.
- Origem não permitida `http://evil.example`: não recebeu `Access-Control-Allow-Origin`.
- Nenhum `*` em produção.
- `SWAGGER_ENABLED=false`.
- `/docs`: 404.

## Persistência final

- Restart da API: `/ready` voltou 200 e dados preservados.
- Restart do PostgreSQL: `/ready` voltou 200 e dados preservados.
- `docker compose down` sem `-v`, seguido de `up -d`: dados preservados.
- Contagens permaneceram: usuários 3, clientes 1, equipamentos 1, OS 1, budgets 1, stock movements 2, históricos 7, peças 1.
- Nenhum volume foi removido.

## Backup da instalação final

- Arquivo: `backups/techdesk-v1-final-2026-08-15_01-21-37.dump`.
- Tamanho: 30529 bytes.
- SHA256: `57A33B0D265AD8B41BEB6BC18CEC9946DFB534D7ACBC9313CFBB4A0E3FBE8EAC`.
- Validação: `pg_restore -l` com exit code 0.

## Restore final

- Banco isolado: `techdesk_v1_final_restore`.
- Restore executado com sucesso.
- Contagens após restore: usuários 3, clientes 1, equipamentos 1, OS 1, budgets 1, stock movements 2, históricos 7, peças 1.
- Relação `ServiceOrder -> Customer -> Equipment`: 1 registro válido.
- Relação `StockMovement -> Part -> User -> ServiceOrder`: 2 registros válidos.

## Logs finais

- API: sem senha, JWT secret, PostgreSQL password, Authorization completo, Bearer token, public token em URL, `statusCode: 500`, `level: 50`, `Unhandled`, `Prisma error`, `panic` ou `Internal server error`.
- Frontend: sem senha, Bearer token, JWT secret, PostgreSQL password ou URL de tracking com token público nos logs inspecionados.

## Blockers

- Nenhum.

## Tech debts pós-v1

- Estorno auditável de consumo de peça.
- CPF/CPF-CNPJ como identificação única de cliente.
- Otimização do chunk do Vite.
- Revisão futura da estratégia de armazenamento do JWT no frontend.

## Decisão

- Resultado: RELEASE v1.0.0 APROVADA.
- Critério: todos os checks críticos passaram; instalação limpa, smoke, RBAC, tracking público, persistência, backup/restore, Docker, CORS, Swagger e logs foram validados.
- Próximo passo permitido: commit final de release e tag local `v1.0.0`.
- Push: não executar sem autorização explícita.
