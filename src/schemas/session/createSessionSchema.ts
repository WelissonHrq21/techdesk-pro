import { z } from "zod";

export const createSessionSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1, { message: "Login is required" }),
  password: z
    .string()
    .min(1, { message: "Password is required" }),
}).strict();

export type CreateSessionSchema = z.infer<
  typeof createSessionSchema
>;
