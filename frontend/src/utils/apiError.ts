import axios from "axios";

export function getApiErrorStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Não foi possível concluir a operação."
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
