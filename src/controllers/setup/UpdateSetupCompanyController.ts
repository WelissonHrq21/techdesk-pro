import { Request, Response } from "express";
import { updateCompanySettingsSchema } from "../../schemas/settings/updateCompanySettingsSchema";
import { UpdateSetupCompanyService } from "../../services/setup/UpdateSetupCompanyService";

class UpdateSetupCompanyController {
  async handle(request: Request, response: Response) {
    const data = updateCompanySettingsSchema.parse(request.body);
    const settings = await new UpdateSetupCompanyService().execute(data);

    return response.status(200).json(settings);
  }
}

export { UpdateSetupCompanyController };
