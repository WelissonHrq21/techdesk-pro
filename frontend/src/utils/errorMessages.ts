import { getApiErrorMessage } from "./apiError";

export function getFriendlyErrorMessage(error: unknown) {
  const message = getApiErrorMessage(error);

  const knownMessages: Record<string, string> = {
    "Email already exists": "Ja existe um cliente cadastrado com este e-mail.",
    "Serial number already exists":
      "Este numero de serie ja esta cadastrado.",
    "Login already registered": "Este login ja esta em uso.",
    "The last active admin cannot lose the ADMIN role":
      "O ultimo administrador ativo nao pode perder o perfil de Administrador.",
    "The last active admin cannot be deactivated":
      "O ultimo administrador ativo nao pode ser desativado.",
    "Users cannot deactivate themselves":
      "Voce nao pode desativar seu proprio usuario.",
    "You cannot deactivate your own user":
      "Voce nao pode desativar seu proprio usuario.",
    "Current password is incorrect": "Senha atual incorreta.",
    "New password must be different from current password":
      "A nova senha deve ser diferente da senha atual.",
    "Public service order not found":
      "Nao foi possivel localizar esta ordem de servico.",
    "Customer is inactive":
      "Nao e possivel cadastrar equipamento para um cliente desativado.",
    "Equipment does not belong to this customer":
      "O equipamento selecionado nao pertence ao cliente.",
    "This equipment already has an open service order":
      "Este equipamento ja possui uma ordem de servico em andamento.",
    "Service order not found": "Ordem de servico nao encontrada.",
    "Part not found": "Peca nao encontrada.",
    "Part is inactive": "Esta peca esta inativa.",
    "Insufficient stock": "Estoque insuficiente para esta saida.",
    "Only the latest budget version can be approved":
      "Apenas o orcamento mais recente pode ser aprovado.",
    "Only the latest budget version can be rejected":
      "Apenas o orcamento mais recente pode ser rejeitado.",
    "Consumed quantity exceeds approved budget quantity":
      "A quantidade consumida ultrapassa a quantidade aprovada.",
    "Part is not included in the approved budget":
      "Esta peca nao faz parte do orcamento aprovado.",
    "Revised budget cannot remove a part already consumed":
      "Uma peca ja consumida nao pode ser removida da revisao.",
    "Revised budget quantity cannot be lower than already consumed quantity":
      "A revisao nao pode deixar quantidade menor que o total ja consumido.",
    "Service order must have a budget before awaiting approval":
      "A OS precisa ter um orcamento antes de ir para aprovacao.",
    "Service order is not awaiting budget approval":
      "Esta OS nao esta aguardando aprovacao de orcamento.",
    "Budget revision can only be created during maintenance":
      "A revisao de orcamento so pode ser criada durante a manutencao.",
    "Invalid status transition":
      "A OS mudou de estado. Atualize a tela e tente novamente.",
  };

  const partialMessage = Object.entries(knownMessages).find(([key]) =>
    message.startsWith(key)
  );

  return partialMessage?.[1] ?? knownMessages[message] ?? message;
}
