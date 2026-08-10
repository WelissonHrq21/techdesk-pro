import { Request, Response } from "express";
import { FindUsersService } from "../../services/user/FindUsersService";

class FindUsersController {
  async handle(request: Request, response: Response) {
    const findUsersService = new FindUsersService();

    const users = await findUsersService.execute();

    return response.status(200).json(users);
  }
}

export { FindUsersController };
