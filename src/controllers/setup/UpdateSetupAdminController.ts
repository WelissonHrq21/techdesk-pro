import { Request, Response } from "express";
import { updateSetupAdminSchema } from "../../schemas/setup/updateSetupAdminSchema";
import { UpdateSetupAdminService } from "../../services/setup/UpdateSetupAdminService";

class UpdateSetupAdminController {
  async handle(request: Request, response: Response) {
    const data = updateSetupAdminSchema.parse(request.body);
    const user = await new UpdateSetupAdminService().execute({
      userId: request.user.id,
      ...data,
    });

    return response.status(200).json(user);
  }
}

export { UpdateSetupAdminController };
