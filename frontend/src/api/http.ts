import axios from "axios";
import { clearStoredSession, getStoredToken } from "../utils/authStorage";

let onUnauthorized: ((message?: string) => void) | null = null;

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

http.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;
    const requestUrl = axios.isAxiosError(error)
      ? error.config?.url
      : undefined;

    if (status === 401 && requestUrl !== "/sessions") {
      const responseMessage = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      const message =
        responseMessage === "Session revoked"
          ? "Sua sessão foi encerrada. Entre novamente."
          : "Sua sessão expirou. Entre novamente.";

      clearStoredSession();
      onUnauthorized?.(message);
    }

    return Promise.reject(error);
  }
);

export function registerUnauthorizedHandler(
  handler: (message?: string) => void
) {
  onUnauthorized = handler;

  return () => {
    if (onUnauthorized === handler) {
      onUnauthorized = null;
    }
  };
}
