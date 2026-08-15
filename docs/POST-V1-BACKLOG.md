# Post-v1 Backlog

Itens conhecidos que não bloqueiam a versão estável v1.0.0.

## High

- Estorno auditável de consumo de peça.

Antes de implementar, definir:

- Quem pode estornar.
- Em quais estados da OS.
- Motivo obrigatório.
- Se o estoque retorna automaticamente.
- Movimento inverso em `StockMovement`.
- Registro no histórico da OS.
- Relação com orçamento aprovado.
- Como tratar peça já faturada.
- Como tratar OS entregue.

## Medium

- CPF/CPF-CNPJ como identificação única de cliente.

Antes de implementar, decidir:

- CPF somente ou CPF/CNPJ.
- Pessoa física/jurídica.
- Campo obrigatório ou opcional.
- Normalização.
- Constraint `unique`.
- Migração dos clientes atuais.
- Tratamento de duplicados.

- Otimização do bundle do frontend.

O Vite alerta chunk acima de 500 kB. Não bloqueia v1, mas pode ser melhorado com code splitting por rota.

## Low

- Melhorias UX menores identificadas após piloto.
- Refinar documentos impressos com identidade visual final da assistência.
- Relatórios operacionais adicionais.
- Integrações futuras como WhatsApp, NF-e e financeiro.

## Política SemVer

### v1.0.1

Correções compatíveis:

- Bugs.
- Ajustes de UX.
- Correções de segurança.
- Pequenos fixes sem mudança de contrato.

### v1.1.0

Novas funcionalidades compatíveis:

- Estorno auditável de consumo de peça.
- CPF/CPF-CNPJ.
- Relatórios.
- QR Code.
- Evoluções operacionais que preservem compatibilidade.

### v2.0.0

Mudanças incompatíveis:

- Alterações que quebrem contratos públicos.
- Mudanças estruturais de arquitetura.
- Mudanças de fluxo que exijam migração operacional incompatível.

## Estratégia de branches e tags

- `main`: versões estáveis.
- `feature/*`: novas funcionalidades.
- `fix/*`: correções.
- `release/*`: preparação de release quando necessário.
- Tags `vX.Y.Z`: versões publicadas ou aprovadas localmente para publicação.
