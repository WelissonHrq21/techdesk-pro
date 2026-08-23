import { z } from "zod";
import { budgetItemSchema } from "./budgetItemSchema";

export const createBudgetRevisionSchema = z.object({
  items: z
    .array(budgetItemSchema)
    .min(1, { message: "Budget revision must have at least one item" }),

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
