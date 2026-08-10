import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { AppError } from "../../errors/AppError";
import { UserRepository } from "../../repositories/UserRepository";

type UpdateUserData = {
  name?: string;
  login?: string;
  password?: string;
  role?: UserRole;
};

type UpdateUserServiceData = {
  id: string;
  data: UpdateUserData;
};

class UpdateUserService {
  async execute({ id, data }: UpdateUserServiceData) {
    const userRepository = new UserRepository();

    const user = await userRepository.findById(id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.active) {
      throw new AppError("User is inactive", 400);
    }

    if (data.login) {
      const existingUser = await userRepository.findByLogin(data.login);

      if (existingUser && existingUser.id !== user.id) {
        throw new AppError("Login already registered", 409);
      }
    }

    if (
      user.role === UserRole.ADMIN &&
      data.role &&
      data.role !== UserRole.ADMIN
    ) {
      const activeAdmins = await userRepository.countActiveAdmins();

      if (activeAdmins <= 1) {
        throw new AppError(
          "The last active admin cannot lose the ADMIN role",
          409
        );
      }
    }

    const updateData = {
      name: data.name,
      login: data.login,
      role: data.role,
      password: data.password
        ? await hash(data.password, 10)
        : undefined,
    };

    return userRepository.update(id, updateData);
  }
}

export { UpdateUserService };
