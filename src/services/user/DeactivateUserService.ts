import { UserRole } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { UserRepository } from "../../repositories/UserRepository";

type DeactivateUserData = {
  userId: string;
  authenticatedUserId: string;
};

class DeactivateUserService {
  async execute({ userId, authenticatedUserId }: DeactivateUserData) {
    const userRepository = new UserRepository();

    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.id === authenticatedUserId) {
      throw new AppError("You cannot deactivate your own user", 400);
    }

    if (!user.active) {
      throw new AppError("User is inactive", 400);
    }

    if (user.role === UserRole.ADMIN) {
      const activeAdmins = await userRepository.countActiveAdmins();

      if (activeAdmins <= 1) {
        throw new AppError(
          "The last active admin cannot be deactivated",
          409
        );
      }
    }

    return userRepository.deactivate(userId);
  }
}

export { DeactivateUserService };
