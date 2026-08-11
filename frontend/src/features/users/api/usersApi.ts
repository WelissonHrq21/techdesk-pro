import { http } from "../../../api/http";
import type { User, UserFormData } from "../types/user";

function cleanUserPayload(data: UserFormData, mode: "create" | "edit") {
  return {
    name: data.name.trim(),
    login: data.login.trim(),
    role: data.role,
    password:
      mode === "create" || data.password?.trim()
        ? data.password?.trim()
        : undefined,
  };
}

export async function findUsers() {
  const response = await http.get<User[]>("/users");

  return response.data;
}

export async function findUser(id: string) {
  const response = await http.get<User>(`/users/${id}`);

  return response.data;
}

export async function createUser(data: UserFormData) {
  const response = await http.post<User>(
    "/users",
    cleanUserPayload(data, "create")
  );

  return response.data;
}

export async function updateUser(id: string, data: UserFormData) {
  const response = await http.put<User>(
    `/users/${id}`,
    cleanUserPayload(data, "edit")
  );

  return response.data;
}

export async function deactivateUser(id: string) {
  const response = await http.delete<User>(`/users/${id}`);

  return response.data;
}
