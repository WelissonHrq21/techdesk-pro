import axios from "axios";

export function getApiErrorMessage(
  error: unknown,
  fallback = "Nao foi possivel concluir a operacao."
) {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (error.response?.status === 403) {
    return "Voce nao tem permissao para realizar esta acao.";
  }

  const message = error.response?.data?.message;

  return typeof message === "string" ? message : fallback;
}
