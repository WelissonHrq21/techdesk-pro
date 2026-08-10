import { z } from "zod";

export const createStockExitSchema = z.object({
  quantity: z
    .number()
    .int({ message: "Quantity must be an integer" })
    .min(1, { message: "Quantity must be at least 1" }),
  reason: z
    .string()
    .trim()
    .max(500, {
      message: "Reason must be less than 500 characters",
    })
    .optional(),
  serviceOrderId: z
    .string()
    .uuid({ message: "Service order ID is invalid" })
    .optional(),
}).strict();

export type CreateStockExitSchema = z.infer<
  typeof createStockExitSchema
>;
