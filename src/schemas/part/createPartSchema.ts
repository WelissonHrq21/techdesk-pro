import { z } from "zod";

export const createPartSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  brand: z
    .string()
    .trim()
    .min(1, { message: "Brand is required" })
    .max(100, { message: "Brand must be less than 100 characters" }),
  currentPrice: z
    .number()
    .positive({ message: "Current price must be positive" }),
  minimumStock: z
    .number()
    .int({ message: "Minimum stock must be an integer" })
    .min(0, { message: "Minimum stock must be at least 0" })
    .default(0),
  supplier: z
    .string()
    .trim()
    .max(150, {
      message: "Supplier must be less than 150 characters",
    })
    .optional(),
}).strict();

export type CreatePartSchema = z.infer<typeof createPartSchema>;
