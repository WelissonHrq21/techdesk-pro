import { Request, Response } from "express";
import { createUserSchema } from "../../schemas/user/createUserSchema";
import { CreateUserService } from "../../services/user/CreateUserService";

class CreateUserController {
  async handle(request: Request, response: Response) {
    const data = createUserSchema.parse(request.body);

    const createUserService = new CreateUserService();

    const user = await createUserService.execute(data);

    return response.status(201).json(user);
  }
}

export { CreateUserController };
