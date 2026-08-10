import { Request, Response } from "express";
import { updateUserSchema } from "../../schemas/user/updateUserSchema";
import { UpdateUserService } from "../../services/user/UpdateUserService";

type UpdateUserParams = {
  id: string;
};

class UpdateUserController {
  async handle(request: Request, response: Response) {
    const { id } = request.params as { id: string };
    const data = updateUserSchema.parse(request.body);

    const updateUserService = new UpdateUserService();

    const user = await updateUserService.execute({
      id,
      data,
    });

    return response.status(200).json(user);
  }
}

export { UpdateUserController };
