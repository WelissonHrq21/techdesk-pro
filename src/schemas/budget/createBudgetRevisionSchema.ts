import { z } from "zod";

export const createBudgetRevisionSchema = z.object({
  items: z.array(
    z.object({
      partId: z.uuid({
        message: "Part ID is invalid",
      }),
      quantity: z
        .number()
        .int({ message: "Quantity must be an integer" })
        .min(1, { message: "Quantity must be at least 1" }),
      unitPrice: z
        .number()
        .positive({ message: "Unit price must be positive" }),
    }).strict()
  ).min(1, { message: "Budget revision must have at least one item" }),

  observation: z
    .string()
    .trim()
    .max(500, {
      message: "Observation must be less than 500 characters",
    })
    .optional(),
}).strict();

export type CreateBudgetRevisionSchema = z.infer<
  typeof createBudgetRevisionSchema
>;
