import type { AuthUser } from "../types/auth";

const tokenKey = "techdesk.token";
const userKey = "techdesk.user";

export function getStoredToken() {
  return localStorage.getItem(tokenKey);
}

export function getStoredUser() {
  const rawUser = localStorage.getItem(userKey);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem(userKey);
    return null;
  }
}

export function storeSession(token: string, user: AuthUser) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
}
