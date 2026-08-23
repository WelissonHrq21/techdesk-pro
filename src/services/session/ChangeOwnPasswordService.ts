import { compare, hash } from "bcryptjs";
import { AppError } from "../../errors/AppError";
import { UserRepository } from "../../repositories/UserRepository";

type ChangeOwnPasswordData = {
  userId: string;
  currentPassword: string;
  newPassword: string;
};

class ChangeOwnPasswordService {
  async execute({
    userId,
    currentPassword,
    newPassword,
  }: ChangeOwnPasswordData) {
    const userRepository = new UserRepository();
    const user = await userRepository.findPrivateById(userId);

    if (!user || !user.active) {
      throw new AppError("Invalid authentication token", 401);
    }

    const passwordMatches = await compare(currentPassword, user.password);

    if (!passwordMatches) {
      throw new AppError("Current password is incorrect", 400);
    }

    if (currentPassword === newPassword) {
      throw new AppError(
        "New password must be different from current password",
        400
      );
    }

    return userRepository.updatePasswordAndRevokeSessions(
      userId,
      await hash(newPassword, 10)
    );
  }
}

export { ChangeOwnPasswordService };
