# Post-v1 Backlog

Itens conhecidos que não bloqueiam a Release Candidate v1.0.0.

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
