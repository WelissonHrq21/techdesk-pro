import type { UserRole } from "../../../types/auth";

export type User = {
  id: string;
  name: string;
  login: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserFormData = {
  name: string;
  login: string;
  role: UserRole;
  password?: string;
  confirmPassword?: string;
};
