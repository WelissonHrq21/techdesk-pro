import { z } from "zod";

export const reverseStockMovementSchema = z.object({
  quantity: z
    .number()
    .int({ message: "Quantity must be an integer" })
    .min(1, { message: "Quantity must be at least 1" }),
  reason: z
    .string()
    .trim()
    .min(1, { message: "Reason is required" })
    .max(500, {
      message: "Reason must be less than 500 characters",
    }),
}).strict();

export type ReverseStockMovementSchema = z.infer<
  typeof reverseStockMovementSchema
>;
