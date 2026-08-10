import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { authConfig } from "../config/auth";
import { AppError } from "../errors/AppError";
import { UserRepository } from "../repositories/UserRepository";

type TokenPayload = {
  sub?: string;
  role?: UserRole;
};

type VerifiedTokenPayload = TokenPayload & {
  sub: string;
};

function isTokenPayload(
  decoded: unknown
): decoded is VerifiedTokenPayload {
  return (
    typeof decoded === "object" &&
    decoded !== null &&
    typeof (decoded as TokenPayload).sub === "string"
  );
}

export async function ensureAuthenticated(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new AppError("Authentication required", 401);
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError("Invalid authentication token", 401);
  }

  try {
    const decoded = verify(token, authConfig.jwt.secret);

    if (!isTokenPayload(decoded)) {
      throw new AppError("Invalid authentication token", 401);
    }

    const userRepository = new UserRepository();
    const user = await userRepository.findById(decoded.sub);

    if (!user || !user.active) {
      throw new AppError("Invalid authentication token", 401);
    }

    request.user = {
      id: user.id,
      role: user.role,
    };

    return next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Invalid authentication token", 401);
  }
}
