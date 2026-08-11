import { getApiErrorMessage } from "./apiError";

export function getFriendlyErrorMessage(error: unknown) {
  const message = getApiErrorMessage(error);

  const knownMessages: Record<string, string> = {
    "Email already exists": "Ja existe um cliente cadastrado com este e-mail.",
    "Serial number already exists":
      "Este numero de serie ja esta cadastrado.",
    "Customer is inactive":
      "Nao e possivel cadastrar equipamento para um cliente desativado.",
    "Equipment does not belong to this customer":
      "O equipamento selecionado nao pertence ao cliente.",
    "This equipment already has an open service order":
      "Este equipamento ja possui uma ordem de servico em andamento.",
  };

  return knownMessages[message] ?? message;
}
