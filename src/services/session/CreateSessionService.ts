import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { authConfig } from "../../config/auth";
import { AppError } from "../../errors/AppError";
import { UserRepository } from "../../repositories/UserRepository";
import { GetSetupStatusService } from "../setup/GetSetupStatusService";

type CreateSessionData = {
  login: string;
  password: string;
};

class CreateSessionService {
  async execute({ login, password }: CreateSessionData) {
    const userRepository = new UserRepository();

    const user = await userRepository.findByLogin(login);

    if (!user) {
      throw new AppError("Invalid login or password", 401);
    }

    const passwordMatches = await compare(password, user.password);

    if (!passwordMatches || !user.active) {
      throw new AppError("Invalid login or password", 401);
    }

    const token = sign(
      {
        role: user.role,
        tokenVersion: user.tokenVersion,
      },
      authConfig.jwt.secret,
      {
        subject: user.id,
        expiresIn: authConfig.jwt.expiresIn,
      }
    );
    const setupStatus = await new GetSetupStatusService().execute();

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        login: user.login,
        role: user.role,
        setupCompleted: setupStatus.setupCompleted,
      },
    };
  }
}

export { CreateSessionService };
