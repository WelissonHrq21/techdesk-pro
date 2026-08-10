import { z } from "zod";

export const updatePartSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" })
    .optional(),
  brand: z
    .string()
    .trim()
    .min(1, { message: "Brand is required" })
    .max(100, { message: "Brand must be less than 100 characters" })
    .optional(),
  currentPrice: z
    .number()
    .positive({ message: "Current price must be positive" })
    .optional(),
  supplier: z
    .string()
    .trim()
    .max(150, {
      message: "Supplier must be less than 150 characters",
    })
    .optional(),
}).strict();

export type UpdatePartSchema = z.infer<typeof updatePartSchema>;
