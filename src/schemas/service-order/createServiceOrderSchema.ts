import { z } from "zod"
import { accessorySchema } from "../acessory/accessorySchema"

export const createServiceOrderSchema = z.object({
    customerId: z.uuid({
        message: "Customer ID is invalid"
    }),

    equipmentId: z.uuid({
        message: "Equipment ID is invalid"
    }),

    reportedIssue: z.string().trim().min(1, {message: "Reported issue is required"}).max(500, {message: "Reported issue must be less than 500 characters"}),

    password: z.string().trim().max(100, {message: "Password must be less than 100 characters"}).optional(),

    accessories: z.array(accessorySchema).optional()
}).strict();

export type CreateServiceOrderSchema = z.infer<typeof createServiceOrderSchema>;
