import { z } from "zod";

export const equipmentSchema = z.object({
  type: z
    .string()
    .trim()
    .min(1, "Informe o tipo.")
    .max(100, "Tipo deve ter no maximo 100 caracteres."),
  brand: z
    .string()
    .trim()
    .min(1, "Informe a marca.")
    .max(20, "Marca deve ter no maximo 20 caracteres."),
  model: z
    .string()
    .trim()
    .min(1, "Informe o modelo.")
    .max(20, "Modelo deve ter no maximo 20 caracteres."),
  serialNumber: z
    .string()
    .trim()
    .max(20, "Serial deve ter no maximo 20 caracteres.")
    .optional()
    .or(z.literal("")),
  customerId: z.string().uuid("Cliente invalido."),
});

export type EquipmentSchemaData = z.infer<typeof equipmentSchema>;
