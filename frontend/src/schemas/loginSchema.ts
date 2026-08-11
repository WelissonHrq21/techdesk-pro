import { z } from "zod";

export const loginSchema = z.object({
  login: z.string().trim().min(1, "Informe o login."),
  password: z.string().min(1, "Informe a senha."),
});

export type LoginFormData = z.infer<typeof loginSchema>;
