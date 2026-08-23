# TechDesk Pro v1.2.0 - Release Notes

## Destaques

TechDesk Pro v1.2.0 amplia o fluxo operacional de orcamentos, estoque e
seguranca sem quebrar os dados criados na v1.1.1.

- Orcamentos aceitam itens `PART` e `SERVICE` no mesmo documento.
- Orcamentos somente com servicos sao suportados.
- Nome, descricao e preco dos itens ficam preservados como snapshot historico.
- Revisoes de orcamento recebem versao sequencial com protecao contra
  concorrencia.
- Pecas possuem estoque minimo e estados `OK`, `LOW_STOCK` e `OUT_OF_STOCK`.
- Entradas, saidas e estornos mantem historico auditavel, paginado e filtravel.
- Saidas manuais e consumos concorrentes nao podem deixar saldo negativo.
- Acoes concorrentes de OS e orcamento deixam apenas uma decisao valida.
- Troca de senha, alteracao de papel e desativacao revogam sessoes anteriores
  por meio de `tokenVersion`.
- Comprovantes e orcamentos exibem QR Code para acompanhamento publico seguro.

## Compatibilidade de dados

O upgrade suportado e `v1.1.1 -> v1.2.0`. Itens de orcamento legados sao
convertidos para `PART`, preservando IDs, quantidade, preco e descricao. Pecas
existentes recebem `minimumStock = 0`; usuarios existentes recebem
`tokenVersion = 0`. Clientes, equipamentos, OS, status, token publico,
movimentos, estornos e configuracoes da empresa sao preservados.

Tokens emitidos por versoes antigas, sem a claim `tokenVersion`, deixam de ser
aceitos depois do upgrade. As credenciais existentes continuam validas para um
novo login.

## Upgrade a partir da v1.1.1

1. Confirme que a instalacao v1.1.1 esta saudavel com `techdesk status`.
2. Crie um backup com `techdesk backup` e guarde o SHA256 exibido.
3. Execute `techdesk restore-check CAMINHO SHA256`.
4. Depois da aprovacao da RC e da publicacao das imagens, execute
   `techdesk upgrade --version 1.2.0`.
5. Confirme versao, frontend, health e ready com `techdesk status`.
6. Valide login, uma OS existente, historico de estoque e tracking publico.

O upgrade oficial executa seu proprio backup gate antes de atualizar imagens,
aplica migrations pelo startup da API e so grava a nova metadata depois dos
smokes de health e ready.

## Instalacao limpa

Use o instalador final aprovado para Ubuntu Server LTS com Docker Engine e o
plugin Docker Compose. O primeiro acesso entra no onboarding para configurar a
empresa, revisar o ADMIN e criar os usuarios iniciais.

PostgreSQL permanece somente na rede interna do Compose. Swagger fica
desabilitado em producao e o frontend usa a API same-origin em `/api`.

## Observacoes operacionais

- Itens `SERVICE` nunca movimentam estoque.
- Estornos mantem relacao com a saida original e respeitam o saldo reversivel.
- O QR usa a origem atual do navegador, acompanhando hostname, IP, porta e
  HTTPS usados pelo operador no momento da impressao.
- O tracking publico nao retorna CPF/CNPJ, senha, JWT, IDs internos de cliente
  ou usuario, diagnostico ou dados de estoque.
- Backups continuam sendo responsabilidade operacional e devem ter copia fora
  do host da aplicacao.

## Release Candidate

O artefato local preparado para validacao e
`techdesk-pro-setup-1.2.0-rc.1.tar.gz`. As imagens oficiais da RC devem ser
publicadas pelo workflow hardened a partir do commit aprovado e CI verde. A
tag final `v1.2.0` e a GitHub Release somente podem ser criadas depois do smoke
Linux com imagens realmente baixadas do GHCR.
