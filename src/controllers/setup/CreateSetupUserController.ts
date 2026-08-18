import { Request, Response } from "express";
import { createSetupUserSchema } from "../../schemas/setup/createSetupUserSchema";
import { CreateSetupUserService } from "../../services/setup/CreateSetupUserService";

class CreateSetupUserController {
  async handle(request: Request, response: Response) {
    const data = createSetupUserSchema.parse(request.body);
    const user = await new CreateSetupUserService().execute(data);

    return response.status(201).json(user);
  }
}

export { CreateSetupUserController };
