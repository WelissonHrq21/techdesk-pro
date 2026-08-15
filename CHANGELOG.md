# Changelog

## 1.0.0 - Release Candidate

### Added

- Autenticação JWT com restauração via `/me`.
- RBAC com papéis `ADMIN`, `RECEPTION` e `TECHNICIAN`.
- CRUD operacional de clientes, equipamentos, peças e usuários.
- Abertura e ciclo completo de ordens de serviço.
- Diagnóstico técnico.
- Orçamentos versionados com itens e valor total preservado.
- Aprovação, rejeição e revisão de orçamento.
- Estoque auditável com `StockMovement`.
- Consumo de peças durante manutenção.
- Dashboard operacional com OS recentes e movimentos recentes.
- Configurações da empresa para documentos.
- Impressão de protocolo de OS e orçamento.
- Consulta pública de OS por token.
- OpenAPI/Swagger controlado por env.
- Health checks `/health` e `/ready`.
- Logs estruturados com redaction de dados sensíveis.
- Docker de produção para API, PostgreSQL e frontend estático.

### Changed

- Frontend preparado para build de produção com `frontend/dist`.
- Frontend passa a ter container Nginx com fallback SPA.
- Swagger fica desabilitado por padrão em produção.
- Scripts oficiais de backup usam `pg_dump -Fc` e validação com `pg_restore -l`.

### Security

- Secrets ficam fora do Git por `.gitignore`.
- CORS exige origem explícita.
- Senhas são armazenadas com hash.
- Usuário inativo perde acesso.
- Token público não expõe senha, usuários internos, estoque ou dados administrativos.

### Fixed

- Correções do piloto em contraste, fluxo cliente -> OS, toast persistente e textos/encoding.
- Observações históricas do Dia 4 deixaram de exibir enums técnicos para o usuário.
