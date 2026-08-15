# Release Checklist - TechDesk Pro v1.0.0 RC

Use este checklist antes de promover uma build para operação real.

## Pre-Deploy

- [ ] Working tree limpo.
- [ ] Backend `npm run typecheck` passou.
- [ ] Backend `npm test` passou.
- [ ] Backend `npm run build` passou.
- [ ] Frontend `npm run lint` passou.
- [ ] Frontend `npm test` passou.
- [ ] Frontend `npm run build` passou.
- [ ] Docker build validado.
- [ ] Migrations revisadas.
- [ ] Nenhuma migration pendente.
- [ ] Backup realizado.
- [ ] Backup validado com `pg_restore -l`.
- [ ] Env configurado fora do Git.
- [ ] Secrets fortes configurados.
- [ ] `CORS_ORIGIN` aponta somente para origens reais.
- [ ] `VITE_API_URL` aponta para a API correta.
- [ ] `SWAGGER_ENABLED` conforme política do ambiente.
- [ ] Volumes persistentes confirmados.

## Deploy

- [ ] PostgreSQL healthy.
- [ ] Migrations aplicadas com `prisma migrate deploy`.
- [ ] API healthy.
- [ ] Frontend disponível.
- [ ] `GET /health` retorna 200.
- [ ] `GET /ready` retorna 200.

## Smoke Test

- [ ] Login.
- [ ] `/me`.
- [ ] Dashboard.
- [ ] Cliente.
- [ ] Equipamento.
- [ ] Abrir OS.
- [ ] Iniciar análise.
- [ ] Registrar diagnóstico.
- [ ] Criar orçamento.
- [ ] Aprovar orçamento.
- [ ] Iniciar manutenção.
- [ ] Consultar estoque.
- [ ] Consumir peça quando aplicável.
- [ ] Finalizar manutenção.
- [ ] Marcar retirada.
- [ ] Entregar OS.
- [ ] Consulta pública por token.

## Pós-Deploy

- [ ] Logs sem `500`, `Unhandled`, `Prisma error` ou `panic`.
- [ ] Backup pós-deploy realizado.
- [ ] Usuários reais criados com contas individuais.
- [ ] CORS validado no navegador.
- [ ] RBAC validado por papéis.
- [ ] Persistência validada após restart.

## Rollback

- [ ] Versão anterior conhecida.
- [ ] Backup anterior conhecido.
- [ ] Procedimento de rollback documentado.
- [ ] Decisão explícita sobre rollback de aplicação.
- [ ] Decisão explícita sobre restore de banco.
- [ ] Nenhuma ação destrutiva executada sem backup validado.
