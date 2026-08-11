import { Request, Response } from "express";
import { FindCompanySettingsService } from "../../services/settings/FindCompanySettingsService";

class FindCompanySettingsController {
  async handle(request: Request, response: Response) {
    const findCompanySettingsService = new FindCompanySettingsService();
    const settings = await findCompanySettingsService.execute();

    return response.status(200).json(settings);
  }
}

export { FindCompanySettingsController };
