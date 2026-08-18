import { z } from "zod";

export const updateSetupAdminSchema = z
  .object({
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
  })
  .strict();

export type UpdateSetupAdminSchema = z.infer<typeof updateSetupAdminSchema>;
