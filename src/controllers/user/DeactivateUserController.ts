import { Request, Response } from "express";
import { DeactivateUserService } from "../../services/user/DeactivateUserService";

type DeactivateUserParams = {
  id: string;
};

class DeactivateUserController {
  async handle(
    request: Request,
    response: Response
  ) {
    const { id } = request.params as { id: string };

    const deactivateUserService = new DeactivateUserService();

    const user = await deactivateUserService.execute({
      userId: id,
      authenticatedUserId: request.user.id,
    });

    return response.status(200).json(user);
  }
}

export { DeactivateUserController };
