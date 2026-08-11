import { Request, Response } from "express";
import { updateCompanySettingsSchema } from "../../schemas/settings/updateCompanySettingsSchema";
import { UpdateCompanySettingsService } from "../../services/settings/UpdateCompanySettingsService";

class UpdateCompanySettingsController {
  async handle(request: Request, response: Response) {
    const data = updateCompanySettingsSchema.parse(request.body);
    const updateCompanySettingsService = new UpdateCompanySettingsService();
    const settings = await updateCompanySettingsService.execute(data);

    return response.status(200).json(settings);
  }
}

export { UpdateCompanySettingsController };
