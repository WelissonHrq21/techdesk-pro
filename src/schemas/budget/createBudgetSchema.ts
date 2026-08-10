import { z } from "zod";

export const createBudgetSchema = z.object({
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
  ).min(1, { message: "Budget must have at least one item" }),
}).strict();

export type CreateBudgetSchema = z.infer<typeof createBudgetSchema>;
