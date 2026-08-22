# Release Checklist - TechDesk Pro

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
- [ ] CI verde no commit exato da release.
- [ ] Build RC executado com nova identidade `X.Y.Z-rc.N`.
- [ ] `release-images.json` arquivado.
- [ ] Digests da API e frontend registrados e aprovados.
- [ ] OCI revision/source correspondem ao commit e repositorio.
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

- [ ] Promotion dry run passou com os digests aprovados.
- [ ] Tags Docker finais ainda nao existem ou apontam para os mesmos digests.
- [ ] Promotion real passou sem rebuild.
- [ ] `:<version>` e `:v<version>` resolvem para os digests aprovados.
- [ ] Git tag criada somente depois da verificacao das imagens finais.
- [ ] GitHub Release criada somente depois da Git tag.

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
- [ ] Integridade pos-publicacao confirmou Git tag, assets e RepoDigests.

## Rollback

- [ ] Versão anterior conhecida.
- [ ] Backup anterior conhecido.
- [ ] Procedimento de rollback documentado.
- [ ] Decisão explícita sobre rollback de aplicação.
- [ ] Decisão explícita sobre restore de banco.
- [ ] Nenhuma ação destrutiva executada sem backup validado.
- [ ] Tags finais nao serao sobrescritas; correcao normal usa nova patch version.

Procedimento completo: `docs/RELEASE-PIPELINE.md`.
