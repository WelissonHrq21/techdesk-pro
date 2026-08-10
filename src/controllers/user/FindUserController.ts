import { Request, Response } from "express";
import { FindUserService } from "../../services/user/FindUserService";

type FindUserParams = {
  id: string;
};

class FindUserController {
  async handle(request: Request, response: Response) {
    const { id } = request.params as { id: string };

    const findUserService = new FindUserService();

    const user = await findUserService.execute(id);

    return response.status(200).json(user);
  }
}

export { FindUserController };
