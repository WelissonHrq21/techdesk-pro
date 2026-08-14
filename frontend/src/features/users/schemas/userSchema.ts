import { z } from "zod";

export const userSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome.").max(100),
    login: z.string().trim().min(3, "Login deve ter ao menos 3 caracteres.").max(50),
    role: z.enum(["ADMIN", "RECEPTION", "TECHNICIAN"]),
    password: z.string().max(100).optional(),
    confirmPassword: z.string().max(100).optional(),
  })
  .superRefine((data, context) => {
    if (data.password && data.password.length < 6) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Senha deve ter ao menos 6 caracteres.",
      });
    }

    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "As senhas não conferem.",
      });
    }
  });

export type UserSchemaData = z.infer<typeof userSchema>;
