import { AppError } from "../../errors/AppError";
import { UserRepository } from "../../repositories/UserRepository";

class FindUserService {
  async execute(id: string) {
    const userRepository = new UserRepository();

    const user = await userRepository.findById(id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }
}

export { FindUserService };
