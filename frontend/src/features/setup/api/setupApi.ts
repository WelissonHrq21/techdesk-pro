import { http } from "../../../api/http";
import type { User } from "../../users/types/user";
import type {
  SetupAdminFormData,
  SetupCompanyFormData,
  SetupStatus,
  SetupUserFormData,
} from "../types/setup";

function cleanCompanyPayload(data: SetupCompanyFormData) {
  return {
    name: data.name.trim(),
    document: data.document?.trim() || undefined,
    phone: data.phone?.trim() || undefined,
    email: data.email?.trim() || undefined,
    address: data.address?.trim() || undefined,
    zipCode: data.zipCode?.trim() || undefined,
  };
}

export async function getSetupStatus() {
  const response = await http.get<SetupStatus>("/setup/status");

  return response.data;
}

export async function updateSetupCompany(data: SetupCompanyFormData) {
  const response = await http.patch(
    "/setup/company",
    cleanCompanyPayload(data)
  );

  return response.data;
}

export async function updateSetupAdmin(data: SetupAdminFormData) {
  const response = await http.patch<User>("/setup/admin", {
    name: data.name.trim(),
    login: data.login.trim(),
  });

  return response.data;
}

export async function createSetupUser(data: SetupUserFormData) {
  const response = await http.post<User>("/setup/users", {
    name: data.name.trim(),
    login: data.login.trim(),
    password: data.password?.trim(),
    role: data.role,
  });

  return response.data;
}

export async function completeSetup() {
  const response = await http.post<{
    setupCompleted: boolean;
    setupCompletedAt: string | null;
  }>("/setup/complete", {
    backupAcknowledged: true,
  });

  return response.data;
}
