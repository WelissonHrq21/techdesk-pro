import { http } from "../../../api/http";
import type {
  CompanySettings,
  CompanySettingsFormData,
} from "../types/companySettings";

function cleanCompanySettingsPayload(data: CompanySettingsFormData) {
  return {
    name: data.name.trim(),
    document: data.document?.trim() || undefined,
    phone: data.phone?.trim() || undefined,
    email: data.email?.trim() || undefined,
    address: data.address?.trim() || undefined,
    zipCode: data.zipCode?.trim() || undefined,
  };
}

export async function findCompanySettings() {
  const response = await http.get<CompanySettings>("/settings/company");

  return response.data;
}

export async function updateCompanySettings(data: CompanySettingsFormData) {
  const response = await http.put<CompanySettings>(
    "/settings/company",
    cleanCompanySettingsPayload(data)
  );

  return response.data;
}
