# Dia 7 - Correções do piloto + regressão completa

## Estado inicial

- Data/hora: 2026-08-14 00:30
- Branch inicial: `codex/openapi-tests-health-logs`
- Commit inicial: `f1dcabd1a0fc6ec53d0d7e26bdf9537de64750d9`
- Git status inicial: limpo
- `/health` inicial: `ok`
- `/ready` inicial: `ready`
- Containers iniciais: `techdesk-pilot-api-1` running/healthy; `techdesk-pilot-postgres-1` running/healthy
- Logs iniciais: sem `500`, `Unhandled`, `Prisma error` ou `panic`
- Backup pré-Dia 7: `backups/pre-dia7-2026-08-14_00-30-02.dump`
- SHA256 pré-Dia 7: `30460F2A8F63469858F30E025F097D4ADDBAB00E20930CC71C959D210BBBBE0A`

## Fotografia inicial do banco

- Usuários: 5
- Clientes: 20
- Equipamentos: 19
- OS: 19
- Budgets: 11
- Stock movements: 9
- Históricos: 60

## Causa raiz dos P2

- P2 contraste: o CSS global `a { color: inherit; }`, declarado depois do Tailwind, sobrescrevia classes como `text-white` em links estilizados como botão. O CTA `Abrir OS` também estava isolado visualmente.
- P2 fluxo cliente -> OS: após criar cliente/equipamento, a UI mantinha a recepção na tela anterior e exigia busca manual para continuar abrindo OS.
- P2 toast persistente: o provider usava timer simples, sem fechamento manual, sem limite de pilha e sem limpeza centralizada de timers.
- P2 encoding/textos: havia dois problemas separados. Alguns dados antigos já estavam gravados no PostgreSQL com caractere de substituição; além disso, várias strings estáticas do frontend estavam sem acento.

## Correções implementadas

- Removida a cor global de links em `frontend/src/index.css`, preservando utilitários Tailwind de cor.
- CTA `Abrir OS` revisado com fundo primário, texto branco, peso adequado e foco visível.
- Cadastro de cliente redireciona para `/service-orders/new?customerId=<id>`.
- Cadastro de equipamento no detalhe do cliente redireciona para `/service-orders/new?customerId=<id>&equipmentId=<id>`.
- Nova OS valida `customerId` da URL; se inválido, limpa seleção e exibe toast de erro.
- Toasts agora têm ids sequenciais, duração por tipo, fechamento manual, limite de quatro mensagens e limpeza de timers no unmount.
- Strings visíveis revisadas em layout, dashboard, clientes, equipamentos, OS, peças, usuários, configurações, perfil, impressão e consulta pública.
- Dados corrompidos no banco foram corrigidos de forma específica por ID/login/campo, sem substituição genérica.
- Usuários piloto `recepcao`, `tecnico`, `recepcao.piloto` e `tecnico.piloto` ficaram com nomes acentuados e UTF-8 confirmado por hex.

## P3 mantidos em backlog

- Estorno/cancelamento auditável de consumo de peça.
- CPF/CPF-CNPJ como identificação única de cliente.

## Arquivos principais alterados

- `frontend/src/index.css`
- `frontend/src/contexts/ToastContext.tsx`
- `frontend/src/contexts/ToastContext.test.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/features/customers/pages/CustomersPage.tsx`
- `frontend/src/features/customers/pages/CustomersPage.test.tsx`
- `frontend/src/features/customers/pages/CustomerDetailPage.tsx`
- `frontend/src/features/service-orders/pages/NewServiceOrderPage.tsx`
- `frontend/src/features/service-orders/pages/ServiceOrderDetailPage.tsx`
- `frontend/src/features/service-orders/components/*`
- `frontend/src/features/parts/*`
- `frontend/src/features/users/*`
- `frontend/src/features/settings/*`
- `frontend/src/features/print/*`
- `frontend/src/utils/labels.ts`
- `frontend/src/utils/errorMessages.ts`
- `docs/PILOT-DAY7-NOTES.md`
- `docs/day7-visual/*`

## Testes automatizados

- Backend `npm run typecheck`: passou.
- Backend `npm test`: passou, 1 arquivo, 13 testes.
- Backend `npm run build`: passou.
- Frontend `npm run lint`: passou.
- Frontend `npm test`: passou, 6 arquivos, 16 testes.
- Frontend `npm run build`: passou. Observação: Vite manteve aviso de chunk acima de 500 kB.

## Testes adicionados/ajustados

- `ToastContext.test.tsx`: desaparecimento automático e fechamento manual.
- `CustomersPage.test.tsx`: criação de cliente redireciona para nova OS com `customerId`.
- `TrackServiceOrderPage.test.tsx`: expectativa atualizada para texto acentuado.
- `AppRoutes.test.tsx`: massa de teste com nome acentuado.

## Regressão funcional

- ADMIN: login, `/me`, dashboard, clientes, equipamentos, OS, peças, usuários e configurações OK.
- RECEPTION: login, busca/leitura de cliente, criação/edição de cliente, criação de equipamento, abertura de OS, aprovação de orçamento, marcação de retirada e entrega OK.
- TECHNICIAN: login, leitura de fila/OS, início de análise, diagnóstico, criação de orçamento, início de manutenção, busca/consumo de peça e finalização OK.
- Fluxo Dia 7 criado para teste: OS `#20`, orçamento V1, consumo de 1 unidade de `SSD BACKUP 512GB`, status final `DELIVERED`.

## RBAC

- Sem token -> 401: OK.
- Token inválido -> 401: OK.
- Usuário sem permissão -> 403: OK.
- ADMIN acessa Users: OK.
- RECEPTION não acessa Users: OK.
- TECHNICIAN não acessa Users: OK.
- RECEPTION não inicia análise técnica: OK.
- TECHNICIAN não aprova orçamento: OK.
- TECHNICIAN não entrega OS: OK.
- TECHNICIAN não faz saída manual de estoque: OK.
- Usuário inativo perde acesso: OK.

## Regressão de dados

- Histórico continuou registrando usuário e transições.
- Status da OS `#20`: `RECEIVED -> IN_ANALYSIS -> AWAITING_APPROVAL -> BUDGET_APPROVED -> IN_MAINTENANCE -> FINISHED -> AWAITING_PICKUP -> DELIVERED`.
- StockMovement criado para consumo da OS, estoque de `SSD BACKUP 512GB` foi de 6 para 5.
- Estoque não ficou negativo.
- Orçamento V1 preservou `unitPrice = 250`.
- OS entregue ficou imutável: tentativa de alteração pós-entrega retornou 400.
- Dashboard retornou dados reais: 14 OS abertas, 10 OS recentes, 10 movimentos recentes.
- Consulta SQL final encontrou `replacement_char_rows = 0` nos campos mapeados.

## Regressão visual

- Ambiente: frontend Vite em `http://127.0.0.1:5173`, API em `http://127.0.0.1:3333`.
- Telas verificadas: dashboard, detalhe do cliente, nova OS, workspace da OS.
- Evidências: `docs/day7-visual/02-dashboard.png`, `03-customer-detail.png`, `04-new-service-order.png`, `05-service-order-workspace.png`, `06-customer-detail-contrast-fixed.png`, `07-service-order-workspace-label-fixed.png`.
- `Abrir OS` após correção: fundo primário e texto computado como `rgb(255, 255, 255)`.
- Checks visuais automatizados: sem caractere de substituição ou padrões conhecidos de mojibake.
- Toasts: sem toast preso nas telas verificadas; provider validado por teste automatizado.

## Estado final

- `/health` final: `ok`.
- `/ready` final: `ready`.
- Containers finais: `techdesk-pilot-api-1` running/healthy; `techdesk-pilot-postgres-1` running/healthy.
- Logs finais: sem `500`, `Unhandled`, `Prisma error` ou `panic` nos últimos 1000 eventos da API.
- Backup pós-Dia 7: `backups/post-dia7-2026-08-14_01-04-26.dump`
- Tamanho backup pós-Dia 7: 40165 bytes
- SHA256 pós-Dia 7: `3530E1B520AE19E9CA5147B01CAE5F0DB8A674C9451E9B5B60550EDCF0AA409F`
- Validação do dump: `pg_restore -l` com exit code 0.

## Fotografia final do banco

- Usuários: 6
- Clientes: 21
- Equipamentos: 20
- OS: 20
- Budgets: 12
- Stock movements: 10
- Históricos: 67
- Estoque final:
  - `Memoria ddr4 Xpg 2666mhz`: 0
  - `Memoria ram ddr3 4gb 1333mhz`: 24
  - `SSD BACKUP 512GB`: 5
  - `TECLADO DIA5 222604`: 4

## Decisão final

- Resultado: GO.
- Motivo: quatro P2 tratados, nenhum P0/P1 encontrado, testes passando, RBAC intacto, dados consistentes, infraestrutura saudável, logs limpos e backup pós-Dia 7 validado.
