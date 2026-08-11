import { z } from "zod";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .or(z.literal(""));

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome.")
    .max(100, "Nome deve ter no maximo 100 caracteres."),
  phone: z
    .string()
    .trim()
    .min(1, "Informe o telefone.")
    .max(20, "Telefone deve ter no maximo 20 caracteres."),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail valido.")
    .max(100, "E-mail deve ter no maximo 100 caracteres.")
    .optional()
    .or(z.literal("")),
  zipCode: optionalText(10, "CEP deve ter no maximo 10 caracteres."),
  address: optionalText(200, "Endereco deve ter no maximo 200 caracteres."),
});

export type CustomerSchemaData = z.infer<typeof customerSchema>;
