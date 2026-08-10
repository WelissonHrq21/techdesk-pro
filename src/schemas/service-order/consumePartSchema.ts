import { z } from "zod";

export const consumePartSchema = z.object({
  quantity: z
    .number()
    .int({ message: "Quantity must be an integer" })
    .min(1, {
      message: "Quantity must be at least 1",
    }),
  observation: z
    .string()
    .trim()
    .max(500, {
      message: "Observation must be less than 500 characters",
    })
    .optional(),
}).strict();

export type ConsumePartSchema = z.infer<typeof consumePartSchema>;
