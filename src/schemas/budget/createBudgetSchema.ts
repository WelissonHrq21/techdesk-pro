import { z } from "zod";
import { budgetItemSchema } from "./budgetItemSchema";

export const createBudgetSchema = z.object({
  items: z
    .array(budgetItemSchema)
    .min(1, { message: "Budget must have at least one item" }),
}).strict();

export type CreateBudgetSchema = z.infer<typeof createBudgetSchema>;
