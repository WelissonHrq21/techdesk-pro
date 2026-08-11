import { z } from "zod";

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Current password is required" }),
    newPassword: z
      .string()
      .min(6, { message: "New password must be at least 6 characters" })
      .max(100, { message: "New password must be less than 100 characters" }),
  })
  .strict();

export type ChangeOwnPasswordSchema = z.infer<
  typeof changeOwnPasswordSchema
>;
