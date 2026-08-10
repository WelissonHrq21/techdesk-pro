import { UserRole } from "@prisma/client";
import { z } from "zod";

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  login: z
    .string()
    .trim()
    .min(3, { message: "Login must be at least 3 characters" })
    .max(50, { message: "Login must be less than 50 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(100, {
      message: "Password must be less than 100 characters",
    }),
  role: z.nativeEnum(UserRole),
}).strict();

export type CreateUserSchema = z.infer<typeof createUserSchema>;
