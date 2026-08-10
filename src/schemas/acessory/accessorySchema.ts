import { z } from "zod"

export const accessorySchema = z.object({
    description: z.string().trim().min(1, {message: "Description is required"}).max(100, {message: "Description must be less than 100 characters"}),

    quantity: z.number().int().min(1, {message: "Quantity must be at least 1"}),

    observation: z.string().trim().max(255, {message: "Observation must b e less than 255 characters"}).optional()
});

export type AccessorySchema = z.infer<typeof accessorySchema>;