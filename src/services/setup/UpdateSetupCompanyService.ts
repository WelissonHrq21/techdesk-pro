import { AppError } from "../../errors/AppError";
import { UpdateCompanySettingsService } from "../settings/UpdateCompanySettingsService";
import { GetSetupStatusService } from "./GetSetupStatusService";

type UpdateSetupCompanyData = {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  zipCode?: string;
};

class UpdateSetupCompanyService {
  async execute(data: UpdateSetupCompanyData) {
    const setupStatus = await new GetSetupStatusService().execute();

    if (setupStatus.setupCompleted) {
      throw new AppError("Initial setup is already completed", 409);
    }

    return new UpdateCompanySettingsService().execute(data);
  }
}

export { UpdateSetupCompanyService };
