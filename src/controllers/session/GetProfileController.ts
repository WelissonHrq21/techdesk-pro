import { Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { UserRepository } from "../../repositories/UserRepository";
import { GetSetupStatusService } from "../../services/setup/GetSetupStatusService";

class GetProfileController {
  async handle(request: Request, response: Response) {
    const userRepository = new UserRepository();

    const user = await userRepository.findById(request.user.id);

    if (!user || !user.active) {
      throw new AppError("Invalid authentication token", 401);
    }
    const setupStatus = await new GetSetupStatusService().execute();

    return response.status(200).json({
      id: user.id,
      name: user.name,
      login: user.login,
      role: user.role,
      setupCompleted: setupStatus.setupCompleted,
    });
  }
}

export { GetProfileController };
