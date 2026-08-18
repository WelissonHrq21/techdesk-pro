import { AppError } from "../../errors/AppError";
import { UpdateUserService } from "../user/UpdateUserService";
import { GetSetupStatusService } from "./GetSetupStatusService";

type UpdateSetupAdminData = {
  userId: string;
  name: string;
  login: string;
};

class UpdateSetupAdminService {
  async execute({ userId, name, login }: UpdateSetupAdminData) {
    const setupStatus = await new GetSetupStatusService().execute();

    if (setupStatus.setupCompleted) {
      throw new AppError("Initial setup is already completed", 409);
    }

    return new UpdateUserService().execute({
      id: userId,
      data: {
        name,
        login,
      },
    });
  }
}

export { UpdateSetupAdminService };
