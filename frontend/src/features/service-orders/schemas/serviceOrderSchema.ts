import { z } from "zod";

export const serviceOrderSchema = z.object({
  customerId: z.string().uuid("Selecione um cliente."),
  equipmentId: z.string().uuid("Selecione um equipamento."),
  reportedIssue: z
    .string()
    .trim()
    .min(1, "Informe o defeito relatado.")
    .max(500, "Defeito relatado deve ter no maximo 500 caracteres."),
  password: z
    .string()
    .trim()
    .max(100, "Senha deve ter no maximo 100 caracteres.")
    .optional()
    .or(z.literal("")),
  accessories: z
    .array(
      z.object({
        description: z
          .string()
          .trim()
          .min(1, "Informe a descricao.")
          .max(100, "Descricao deve ter no maximo 100 caracteres."),
        quantity: z
          .number()
          .int("Quantidade deve ser inteira.")
          .min(1, "Quantidade deve ser pelo menos 1."),
        observation: z
          .string()
          .trim()
          .max(255, "Observacao deve ter no maximo 255 caracteres.")
          .optional()
          .or(z.literal("")),
      })
    )
    .optional(),
});

export type ServiceOrderSchemaData = z.infer<typeof serviceOrderSchema>;
