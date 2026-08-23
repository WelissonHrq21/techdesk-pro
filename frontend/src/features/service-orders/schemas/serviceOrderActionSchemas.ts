import { z } from "zod";

const budgetItemValuesSchema = {
  quantity: z
    .number()
    .int("A quantidade deve ser um número inteiro.")
    .min(1, "A quantidade deve ser no minimo 1."),
  unitPrice: z
    .number()
    .positive("O valor unitario deve ser positivo."),
};

const budgetPartItemSchema = z.object({
  type: z.literal("PART"),
  partId: z.string().uuid("Selecione uma peça válida."),
  ...budgetItemValuesSchema,
});

const budgetServiceItemSchema = z.object({
  type: z.literal("SERVICE"),
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição do serviço.")
    .max(200, "A descrição deve ter no máximo 200 caracteres."),
  ...budgetItemValuesSchema,
});

export const budgetItemSchema = z.discriminatedUnion("type", [
  budgetPartItemSchema,
  budgetServiceItemSchema,
]);

export const observationSchema = z.object({
  observation: z
    .string()
    .trim()
    .max(500, "A observação deve ter no máximo 500 caracteres.")
    .optional(),
});

export const diagnosisSchema = z.object({
  diagnosis: z
    .string()
    .trim()
    .min(1, "Informe o diagnóstico técnico.")
    .max(2000, "O diagnóstico deve ter no máximo 2000 caracteres."),
});

export const budgetFormSchema = z.object({
  items: z
    .array(budgetItemSchema)
    .min(1, "Inclua pelo menos um item no orçamento."),
});

export const budgetRevisionFormSchema = budgetFormSchema.extend({
  observation: z
    .string()
    .trim()
    .max(500, "A observação deve ter no máximo 500 caracteres.")
    .optional(),
});

export const consumePartSchema = z.object({
  quantity: z
    .number()
    .int("A quantidade deve ser um número inteiro.")
    .min(1, "A quantidade deve ser no minimo 1."),
  observation: z
    .string()
    .trim()
    .max(500, "A observação deve ter no máximo 500 caracteres.")
    .optional(),
});

export function createReverseStockMovementSchema(maxQuantity: number) {
  return z.object({
    quantity: z
      .number()
      .int("A quantidade deve ser um número inteiro.")
      .min(1, "A quantidade deve ser no mínimo 1.")
      .max(
        maxQuantity,
        `A quantidade máxima para estorno é ${maxQuantity}.`
      ),
    reason: z
      .string()
      .trim()
      .min(1, "Informe o motivo do estorno.")
      .max(500, "O motivo deve ter no máximo 500 caracteres."),
  });
}

export type ObservationFormValues = z.infer<typeof observationSchema>;
export type DiagnosisFormValues = z.infer<typeof diagnosisSchema>;
export type BudgetFormValues = z.infer<typeof budgetFormSchema>;
export type BudgetRevisionFormValues = z.infer<typeof budgetRevisionFormSchema>;
export type ConsumePartFormValues = z.infer<typeof consumePartSchema>;
export type ReverseStockMovementFormValues = z.infer<
  ReturnType<typeof createReverseStockMovementSchema>
>;
