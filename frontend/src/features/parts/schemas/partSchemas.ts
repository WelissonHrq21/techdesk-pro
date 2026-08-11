import { z } from "zod";

export const partSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(100),
  brand: z.string().trim().min(1, "Informe a marca.").max(100),
  currentPrice: z
    .number()
    .positive("Informe um preco atual positivo."),
  supplier: z.string().trim().max(150).optional(),
});

export const stockMovementFormSchema = z.object({
  quantity: z
    .number()
    .int("A quantidade deve ser inteira.")
    .min(1, "A quantidade deve ser no minimo 1."),
  reason: z.string().trim().max(500).optional(),
  serviceOrderId: z.string().optional(),
});

export type PartSchemaData = z.infer<typeof partSchema>;
export type StockMovementFormData = z.infer<typeof stockMovementFormSchema>;
