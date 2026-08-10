import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { AppError } from "../../errors/AppError";
import { UserRepository } from "../../repositories/UserRepository";

type CreateUserData = {
  name: string;
  login: string;
  password: string;
  role: UserRole;
};

class CreateUserService {
  async execute(data: CreateUserData) {
    const userRepository = new UserRepository();

    const existingUser = await userRepository.findByLogin(data.login);

    if (existingUser) {
      throw new AppError("Login already registered", 409);
    }

    const passwordHash = await hash(data.password, 10);

    return userRepository.create({
      name: data.name,
      login: data.login,
      password: passwordHash,
      role: data.role,
    });
  }
}

export { CreateUserService };
