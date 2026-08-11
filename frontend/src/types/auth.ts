export type UserRole = "ADMIN" | "RECEPTION" | "TECHNICIAN";

export type AuthUser = {
  id: string;
  name: string;
  login: string;
  role: UserRole;
};

export type SessionResponse = {
  token: string;
  user: AuthUser;
};
