import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

export function authorizeRoles(...roles: UserRole[]) {
  return (
    request: Request,
    response: Response,
    next: NextFunction
  ) => {
    if (!roles.includes(request.user.role)) {
      return response.status(403).json({
        message: "Forbidden",
      });
    }

    return next();
  };
}
