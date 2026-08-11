import { CompanySettingsRepository } from "../../repositories/CompanySettingsRepository";

class FindCompanySettingsService {
  async execute() {
    const companySettingsRepository = new CompanySettingsRepository();
    const settings = await companySettingsRepository.findFirst();

    return (
      settings ?? {
        id: null,
        name: "",
        document: null,
        phone: null,
        email: null,
        address: null,
        zipCode: null,
        createdAt: null,
        updatedAt: null,
      }
    );
  }
}

export { FindCompanySettingsService };
