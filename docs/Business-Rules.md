# TechDesk Pro - Business Rules

## Customers

RN-001

Todo cliente deve possuir pelo menos:

Nome
Telefone

RN-002

Um cliente pode possuir vários equipamentos.

RN-003

Um cliente pode possuir várias Ordens de Serviço.


## Equipment

RN-004

Todo equipamento pertence a um único cliente.

N-005

Um equipamento pode possuir várias Ordens de Serviço ao longo da vida útil.


## Service Orders

RN-006

Toda Ordem de Serviço deve possuir um número único.

RN-007

Toda Ordem de Serviço inicia com o status Recebido.

RN-008

A senha do equipamento pertence à Ordem de Serviço.

RN-009

Os acessórios recebidos devem ser registrados na Ordem de Serviço.

RN-010

Uma Ordem de Serviço deve possuir um equipamento.

RN-011

Uma Ordem de Serviço deve possuir um cliente.



## Accessories

RN-012

Todo acessório deve pertencer a uma Ordem de Serviço.

RN-013

Todo acessório dever ser registrado com:
nome
quantidade
observação



## Budgets

RN-014

Todo orçamento deve estar vinculado a uma Ordem de Serviço.

RN-015

Um orçamento somente pode ser criado após a análise técnica.

RN-016

O orçamento deve conter a descrição do diagnóstico técnico.

RN-017

O orçamento deve conter a solução proposta.

RN-018

As peças devem ser informadas separadamente da mão de obra.

RN-019

O sistema deve calcular automaticamente o valor total do orçamento.

RN-020

O orçamento pode possuir uma validade.

RN-021

Uma Ordem de Serviço pode possuir mais de um orçamento caso seja necessária uma revisão.

## Users and Permissions

RN-022

Todo usuário deve possuir um perfil de acesso.

RN-023

Somente administradores podem gerenciar usuários.

RN-024

Recepcionistas podem cadastrar clientes e Ordens de Serviço.

RN-025

Técnicos podem realizar diagnósticos e criar orçamentos.

RN-026

Somente administradores podem excluir registros do sistema.

RN-027

Toda ação realizada por um usuário deve ser identificada.

## History

RN-028

Toda Ordem de Serviço deve possuir um histórico de alterações.

RN-029

Toda alteração de status deve ser registrada.

RN-030

O sistema deve registrar a data e hora das alterações.

RN-031

O sistema deve registrar qual usuário realizou cada alteração.

RN-032

O histórico não poderá ser apagado.

RN-033

As alterações realizadas em orçamentos devem permanecer registradas para consulta futura.

## Service Order Status

RN-034

Uma Ordem de Serviço deve possuir apenas um status por vez.

RN-035

Uma Ordem de Serviço deve iniciar com o status "Recebido".

RN-036

Os status permitidos são:

- Recebido
- Em análise
- Aguardando aprovação
- Orçamento aprovado
- Orçamento recusado
- Em manutenção
- Aguardando retirada
- Entregue
- Cancelado

RN-037

uando o orçamento for recusado, a Ordem de Serviço deve mudar para o status "Orçamento recusado".

RN-038

Uma Ordem de Serviço com orçamento recusado deve mudar para "Aguardando retirada" quando o equipamento estiver disponível para devolução.

RN-039

Uma Ordem de Serviço somente pode ser entregue após estar "Finalizada" ou "Aguardando retirada".

RN-040

Uma Ordem de Serviço pode possuir mais de um orçamento durante seu ciclo de vida.

RN-041

Sempre que um novo orçamento for criado durante a manutenção, a Ordem de Serviço deverá retornar ao status "Aguardando aprovação".

RN-042

Um cliente pode possuir vários equipamentos.

RN-043

Um equipamento deve pertencer a apenas um cliente por vez.

RN-044

Quando um equipamento mudar de proprietário, o sistema deve permitir transferir o equipamento para outro cliente sem apagar seu histórico.

RN-045

Uma Ordem de Serviço pode ser criada sem orçamento.

RN-046

Um orçamento somente pode ser criado após a análise técnica da Ordem de Serviço.

RN-047

Todo orçamento deve pertencer a uma única Ordem de Serviço.

RN-048

Uma Ordem de Serviço pode possuir várias versões de orçamento.

RN-049

Clientes não devem ser apagados imediatamente do sistema. Eles devem ser desativados para preservar o histórico de atendimentos.

RN-050

Um cliente desativado não poderá possuir novas Ordens de Serviço abertas.

RN-051

Somente administradores poderão desativar ou reativar clientes.

RN-052

Equipamentos desativados não devem apagar ou alterar Ordens de Serviço antigas.

RN-053

As Ordens de Serviço antigas devem permanecer disponíveis para consulta, pois servem como histórico e prova de entrada do equipamento na assistência.

RN-054

Um equipamento desativado não poderá receber novas Ordens de Serviço, exceto se for reativado por um usuário autorizado.

RN-055

O número de série do equipamento é opcional, pois pode estar ausente ou ilegível.

RN-056

Quando informado, o número de série não poderá estar associado a outro equipamento.

RN-061

Um equipamento não pode possuir mais de uma Ordem de Serviço aberta simultaneamente.

RN-062

Somente uma OS com status RECEIVED pode ir para IN_ANALYSIS.

RN-063

Não é permitido alterar uma OS para AWAITING_APPROVAL sem existir um orçamento.

RN-062

Uma OS nasce obrigatoriamente com status RECEIVED.

RN-063

Uma OS só pode entrar em AWAITING_APPROVAL se possuir pelo menos um orçamento.

RN-064

Um equipamento não pode possuir duas OS abertas simultaneamente.

RN-065

Após DELIVERED, a OS não pode sofrer alterações.

RN-066

Uma OS cancelada não pode ser reaberta.

RN-067

O equipamento informado deve pertencer ao cliente informado.

RN-068

Clientes desativados não podem abrir novas OS.

RN-069

Equipamentos desativados não podem abrir novas OS.

RN-070

A criação da OS e dos acessórios deve ocorrer na mesma transação.
RN-085

Todo usuario deve possuir nome, login, senha e role.

RN-086

O login deve ser unico.

RN-087

A senha nunca deve ser armazenada em texto puro.

RN-088

A senha nunca deve ser retornada pela API.

RN-089

Usuarios devem ser desativados em vez de apagados fisicamente.

RN-090

Usuarios inativos nao poderao autenticar.

RN-091

A role do usuario deve ser ADMIN, RECEPTION ou TECHNICIAN.

RN-092

Credenciais invalidas devem retornar uma mensagem generica de autenticacao.

RN-093

Rotas privadas devem exigir Authorization Bearer token.

RN-094

O usuario autenticado deve ser obtido pelo JWT e validado no banco a cada requisicao.

RN-095

Operacoes auditaveis devem usar o usuario autenticado, nao userId enviado no body.

## Authorization and RBAC

RN-096

Toda rota privada exige usuario autenticado.

RN-097

A autorizacao deve considerar a role atual do usuario no banco.

RN-098

ADMIN possui acesso administrativo completo.

RN-099

RECEPTION possui acesso as operacoes de atendimento, mas nao as operacoes tecnicas ou administrativas.

RN-100

TECHNICIAN possui acesso as operacoes tecnicas, mas nao a administracao de usuarios e cadastros administrativos.

RN-101

A ausencia de permissao deve retornar HTTP 403.

RN-102

Autenticacao invalida deve retornar HTTP 401.

Matriz inicial de permissoes:

| Acao | ADMIN | RECEPTION | TECHNICIAN |
| --- | --- | --- | --- |
| Consultar clientes | Sim | Sim | Sim |
| Cadastrar cliente | Sim | Sim | Nao |
| Atualizar cliente | Sim | Sim | Nao |
| Desativar cliente | Sim | Nao | Nao |
| Consultar equipamentos | Sim | Sim | Sim |
| Cadastrar equipamento | Sim | Sim | Nao |
| Atualizar equipamento | Sim | Sim | Nao |
| Desativar equipamento | Sim | Nao | Nao |
| Consultar OS | Sim | Sim | Sim |
| Criar OS | Sim | Sim | Sim |
| Alterar status tecnico | Sim | Nao | Sim |
| Registrar retirada/entrega | Sim | Sim | Parcial |
| Registrar diagnostico | Sim | Nao | Sim |
| Criar orcamento | Sim | Nao | Sim |
| Revisar orcamento | Sim | Nao | Sim |
| Registrar aprovacao/rejeicao | Sim | Sim | Nao |
| Consumir peca | Sim | Nao | Sim |
| Consultar pecas | Sim | Sim | Sim |
| Cadastrar/editar/desativar peca | Sim | Nao | Nao |
| Entrada/saida manual estoque | Sim | Nao | Nao |
| Consultar estoque/movimentos | Sim | Sim | Sim |
| Gerenciar usuarios | Sim | Nao | Nao |

## Lists, Search and Dashboard

RN-103

List endpoints must return data and meta with page, limit, total and totalPages.

RN-104

Default pagination is page 1 and limit 20.

RN-105

The maximum page limit is 100.

RN-106

Service Order search must look at OS number, customer name, customer phone, equipment type, brand, model and serial number.

RN-107

dateTo filters for Service Orders must include the whole day.

RN-108

deliveredToday in the dashboard must be calculated from ServiceOrderHistory, not ServiceOrder.updatedAt.

RN-109

Temporary low stock threshold is stock greater than 0 and less than or equal to 5.
