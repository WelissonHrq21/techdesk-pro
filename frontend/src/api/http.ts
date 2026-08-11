import axios from "axios";
import { clearStoredSession, getStoredToken } from "../utils/authStorage";

let onUnauthorized: (() => void) | null = null;

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
      clearStoredSession();
      onUnauthorized?.();
    }

    return Promise.reject(error);
  }
);

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;

  return () => {
    if (onUnauthorized === handler) {
      onUnauthorized = null;
    }
  };
}
