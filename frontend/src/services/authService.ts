import { http } from "../api/http";
import type { AuthUser, SessionResponse } from "../types/auth";

type SignInData = {
  login: string;
  password: string;
};

export async function signInRequest(data: SignInData) {
  const response = await http.post<SessionResponse>("/sessions", data);

  return response.data;
}

export async function getProfileRequest() {
  const response = await http.get<AuthUser>("/me");

  return response.data;
}

export async function changeOwnPasswordRequest(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const response = await http.put<{ message: string }>("/me/password", data);

  return response.data;
}
