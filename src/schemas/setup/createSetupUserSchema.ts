import { UserRole } from "@prisma/client";
import { z } from "zod";
import { createUserSchema } from "../user/createUserSchema";

export const createSetupUserSchema = createUserSchema.refine(
  (data) => data.role === UserRole.RECEPTION || data.role === UserRole.TECHNICIAN,
  {
    message: "Setup can only create RECEPTION or TECHNICIAN users",
    path: ["role"],
  }
);

export type CreateSetupUserSchema = z.infer<typeof createSetupUserSchema>;
