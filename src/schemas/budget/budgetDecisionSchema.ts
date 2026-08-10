import { z } from "zod";

export const budgetDecisionSchema = z.object({
  observation: z
    .string()
    .trim()
    .max(500, {
      message: "Observation must be less than 500 characters",
    })
    .optional(),
}).strict();

export type BudgetDecisionSchema = z.infer<typeof budgetDecisionSchema>;
