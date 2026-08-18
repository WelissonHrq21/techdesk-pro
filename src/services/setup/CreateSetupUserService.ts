import { UserRole } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { CreateUserService } from "../user/CreateUserService";
import { GetSetupStatusService } from "./GetSetupStatusService";

type CreateSetupUserData = {
  name: string;
  login: string;
  password: string;
  role: UserRole;
};

class CreateSetupUserService {
  async execute(data: CreateSetupUserData) {
    const setupStatus = await new GetSetupStatusService().execute();

    if (setupStatus.setupCompleted) {
      throw new AppError("Initial setup is already completed", 409);
    }

    if (data.role === UserRole.ADMIN) {
      throw new AppError("Setup cannot create additional admins", 400);
    }

    return new CreateUserService().execute(data);
  }
}

export { CreateSetupUserService };
