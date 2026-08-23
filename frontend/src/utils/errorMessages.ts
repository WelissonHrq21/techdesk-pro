import { getApiErrorMessage } from "./apiError";

export function getFriendlyErrorMessage(error: unknown) {
  const message = getApiErrorMessage(error);

  const knownMessages: Record<string, string> = {
    "Email already exists": "Ja existe um cliente cadastrado com este e-mail.",
    "Customer document already exists":
      "Ja existe um cliente cadastrado com este CPF/CNPJ.",
    "Serial number already exists":
      "Este numero de serie ja esta cadastrado.",
    "Login already registered": "Este login ja esta em uso.",
    "The last active admin cannot lose the ADMIN role":
      "O ultimo administrador ativo nao pode perder o perfil de Administrador.",
    "The last active admin cannot be deactivated":
      "O ultimo administrador ativo nao pode ser desativado.",
    "Users cannot deactivate themselves":
      "Você não pode desativar seu próprio usuário.",
    "You cannot deactivate your own user":
      "Você não pode desativar seu próprio usuário.",
    "Current password is incorrect": "Senha atual incorreta.",
    "New password must be different from current password":
      "A nova senha deve ser diferente da senha atual.",
    "Public service order not found":
      "Não foi possível localizar esta ordem de serviço.",
    "Customer is inactive":
      "Não é possível cadastrar equipamento para um cliente desativado.",
    "Equipment does not belong to this customer":
      "O equipamento selecionado nao pertence ao cliente.",
    "This equipment already has an open service order":
      "Este equipamento já possui uma ordem de serviço em andamento.",
    "Service order not found": "Ordem de serviço não encontrada.",
    "Part not found": "Peca nao encontrada.",
    "Part is inactive": "Esta peça está inativa.",
    "Insufficient stock":
      "Estoque insuficiente. O saldo foi atualizado; revise a quantidade e tente novamente.",
    "Only the latest budget version can be approved":
      "Apenas o orcamento mais recente pode ser aprovado.",
    "Only the latest budget version can be rejected":
      "Apenas o orcamento mais recente pode ser rejeitado.",
    "Consumed quantity exceeds approved budget quantity":
      "A quantidade consumida ultrapassa a quantidade aprovada.",
    "Part is not included in the approved budget":
      "Esta peça não faz parte do orçamento aprovado.",
    "Revised budget cannot remove a part already consumed":
      "Uma peça já consumida não pode ser removida da revisão.",
    "Revised budget quantity cannot be lower than already consumed quantity":
      "A revisão não pode deixar quantidade menor que o total já consumido.",
    "Service order must have a budget before awaiting approval":
      "A OS precisa ter um orçamento antes de ir para aprovação.",
    "Service order is not awaiting budget approval":
      "Esta OS não está aguardando aprovação de orçamento.",
    "Budget revision can only be created during maintenance":
      "A revisão de orçamento só pode ser criada durante a manutenção.",
    "Invalid status transition":
      "A OS mudou de estado. Atualize a tela e tente novamente.",
    "Stock movement not found": "Movimento de consumo não encontrado.",
    "Only EXIT movements can be reversed":
      "Apenas movimentos de consumo podem ser estornados.",
    "Only service order EXIT movements can be reversed":
      "Apenas consumos vinculados a uma OS podem ser estornados.",
    "Service order status does not allow stock reversal":
      "O status atual da OS não permite estorno.",
    "Reversal quantity exceeds available reversible quantity":
      "Esse consumo já foi estornado total ou parcialmente por outra operação. Os dados foram atualizados.",
    "Budget version conflict. Reload the service order and try again":
      "O orçamento foi alterado em outra sessão. Atualizamos os dados para você.",
  };

  const partialMessage = Object.entries(knownMessages).find(([key]) =>
    message.startsWith(key)
  );

  return partialMessage?.[1] ?? knownMessages[message] ?? message;
}
