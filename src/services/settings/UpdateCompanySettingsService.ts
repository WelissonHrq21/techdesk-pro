import { CompanySettingsRepository } from "../../repositories/CompanySettingsRepository";

type UpdateCompanySettingsData = {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  zipCode?: string;
};

class UpdateCompanySettingsService {
  async execute(data: UpdateCompanySettingsData) {
    const companySettingsRepository = new CompanySettingsRepository();

    return companySettingsRepository.upsertSingleton({
      name: data.name,
      document: data.document || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      zipCode: data.zipCode || undefined,
    });
  }
}

export { UpdateCompanySettingsService };
