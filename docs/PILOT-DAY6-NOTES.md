# Dia 6

## Resumo

- Data:
- Ambiente:
- Backup pre-piloto: pre-dia6-2026-08-13_22-33-22.dump
- Backup pre-piloto SHA256: 6F53E5909BEEC4259FEF30B63A5A119B21B23167CA9358A5791BFF8337BC9899
- Backup pos-piloto:
- Observador: Welison
- Recepcao:
- Tecnico:

## P0

Nenhum.

## P1

Nenhum.

## P2

- Cores de alguns botoes deixam o texto ilegivel em certos estados/contrastes. Evidencia: na tela do cliente, o botao "Abrir OS" aparece com fundo muito escuro e texto/icone pouco visiveis.
- Depois de criar um cliente, o fluxo deveria facilitar a abertura de OS. Sugestao observada: redirecionar automaticamente ou mostrar uma acao primaria clara para abrir OS para aquele cliente.
- Ao criar a OS #18, a tarja/mensagem "OS #18 criada com sucesso" nao desapareceu sozinha, ficando presa na tela e sobrepondo a area superior/status da pagina.
- Existem erros de escrita/encoding no historico da OS. Exemplos observados nas fotos: palavras com acento aparecem com caracteres quebrados no lugar das letras acentuadas; tambem ha textos sem acento como "Historico", "Orcamento aprovado", "Aguardando aprovacao", "Em analise".
- Existem erros de escrita/encoding na secao de usuarios. Exemplos observados nas fotos: nomes como Recepcao Piloto e Tecnico Piloto aparecem com caracteres quebrados no lugar dos acentos.

## P3

- Adicionar uma opcao de cancelar/estornar consumo de peca quando o tecnico decidir que nao vai mais usar a peca. Deve preservar auditoria, idealmente criando movimento inverso em vez de apagar o consumo.
- Adicionar CPF ao cadastro de cliente para servir como identificacao unica e reduzir duplicidade.

## Atendimentos

### Atendimento 1

- OS: #18
- Usuario:
- Perfil:
- Horario:
- Tempo para localizar/cadastrar cliente:
- Tempo para abrir OS:
- Tempo para tecnico localizar OS:
- Houve duvida? Onde?
- Houve erro? Qual?
- Precisou de ajuda? Em que?
- Precisou atualizar a pagina manualmente? Sim/Nao
- Impressao funcionou? Sim/Nao
- Consulta publica funcionou? Sim/Nao
- Observacoes:
  - Mensagem de sucesso da criacao da OS #18 nao desapareceu automaticamente.
  - Fluxo apos criar cliente poderia levar diretamente para abertura de OS.
  - Foram observados problemas de legibilidade em botoes por contraste de cor, especialmente no botao "Abrir OS" da tela de cliente.
  - Foram observados erros de escrita/encoding no historico da OS e na secao de usuarios.
  - Toast de sucesso ficou visivel por tempo excessivo e cobriu parte da tela.

### Atendimento 2

- OS:
- Usuario:
- Perfil:
- Horario:
- Tempo para localizar/cadastrar cliente:
- Tempo para abrir OS:
- Tempo para tecnico localizar OS:
- Houve duvida? Onde?
- Houve erro? Qual?
- Precisou de ajuda? Em que?
- Precisou atualizar a pagina manualmente? Sim/Nao
- Impressao funcionou? Sim/Nao
- Consulta publica funcionou? Sim/Nao
- Observacoes:

### Atendimento 3

- OS:
- Usuario:
- Perfil:
- Horario:
- Tempo para localizar/cadastrar cliente:
- Tempo para abrir OS:
- Tempo para tecnico localizar OS:
- Houve duvida? Onde?
- Houve erro? Qual?
- Precisou de ajuda? Em que?
- Precisou atualizar a pagina manualmente? Sim/Nao
- Impressao funcionou? Sim/Nao
- Consulta publica funcionou? Sim/Nao
- Observacoes:

### Atendimento 4

- OS:
- Usuario:
- Perfil:
- Horario:
- Tempo para localizar/cadastrar cliente:
- Tempo para abrir OS:
- Tempo para tecnico localizar OS:
- Houve duvida? Onde?
- Houve erro? Qual?
- Precisou de ajuda? Em que?
- Precisou atualizar a pagina manualmente? Sim/Nao
- Impressao funcionou? Sim/Nao
- Consulta publica funcionou? Sim/Nao
- Observacoes:

### Atendimento 5

- OS:
- Usuario:
- Perfil:
- Horario:
- Tempo para localizar/cadastrar cliente:
- Tempo para abrir OS:
- Tempo para tecnico localizar OS:
- Houve duvida? Onde?
- Houve erro? Qual?
- Precisou de ajuda? Em que?
- Precisou atualizar a pagina manualmente? Sim/Nao
- Impressao funcionou? Sim/Nao
- Consulta publica funcionou? Sim/Nao
- Observacoes:

## Perguntas Para Recepcao

- O que mais demorou = nada
- Qual botao foi mais dificil de achar = ja foi citado
- Alguma informacao ficou faltando = nao
- Voce entendeu os status = sim
- Buscar cliente foi facil = sim
- Buscar equipamento foi facil = sim
- Abrir uma OS foi rapido? Observacao inicial: apos criar cliente, faltou uma continuacao mais direta para abrir a OS.
- A impressao tem tudo que precisa?
- O que voce mudaria primeiro? Observacao inicial: melhorar fluxo cliente -> abrir OS e legibilidade dos botoes.

## Perguntas Para Tecnico

- A fila mostra claramente o que precisa ser feito = sim
- O defeito fica visivel = sim
- Diagnostico e facil de registrar = sim
- Criar orcamento foi rapido = sim
- Buscar peca foi facil = sim
- Estoque disponivel ficou claro = sim
- Consumo ficou intuitivo = sim(com observacao citada)
- A timeline ajuda = sim
- O que mais atrapalhou? Observacao inicial: falta de opcao para cancelar/estornar consumo de peca quando a peca nao sera mais usada.

## Conferencia Tecnica Final

- Health:
- Ready:
- Containers:
- Logs sem 500/Unhandled/Prisma error/panic:
- Contagem de clientes antes dos atendimentos: 19
- Contagem de equipamentos antes dos atendimentos: 17
- Contagem de OS antes dos atendimentos: 17
- Contagem de budgets antes dos atendimentos: 10
- Contagem de stock movements antes dos atendimentos: 5
- Contagem de historicos antes dos atendimentos: 50

## Preparacao Tecnica

- API: healthy
- Postgres: healthy
- /health: ok
- /ready: ready
- Logs iniciais sem 500/Unhandled/Prisma error/panic: Sim
- Frontend: iniciar manualmente antes dos atendimentos com `cd frontend` e `npm run dev -- --host 127.0.0.1 --port 5173`

## Decisao Do Dia

- Resultado: GO COM RESTRICOES
- Motivo: nao foram relatados P0 ou P1 ate agora, mas ha pontos de UX/texto/fluxo que devem entrar no backlog antes de ampliar o piloto.
- Proximas acoes:
  - Corrigir contraste/legibilidade dos botoes.
  - Melhorar continuidade apos cadastro de cliente, priorizando abertura de OS.
  - Fazer mensagens de sucesso desaparecerem automaticamente ou permitir fechamento manual claro.
  - Corrigir textos do historico da OS e da secao de usuarios.
  - Desenhar regra auditavel para estorno de consumo de peca.
  - Avaliar inclusao de CPF como identificador unico de cliente.
