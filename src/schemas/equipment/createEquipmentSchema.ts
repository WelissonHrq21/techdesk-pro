import { z } from "zod";

 export const createEquipmentSchema = z.object({
    type: z.string().trim().min(1, {message: "type is required"}).max(100, {message: "type must be less than 100 characters"}),
    brand: z.string().trim().min(1, {message: "brand is required"}).max(20, {message: "brand must be less than 20 characters"}),
    model: z.string().trim().min(1, {message: "model is required"}).max(20, {message: "model must be less than 20 characters"}),
    serialNumber: z.string().min(1, {message:"serialNumber is required"}).max(20, {message: "serialNumber must be less than 20 characters"}).trim().optional(),
    customerId: z.string().uuid().min(1, {message: "customerId is required"})
 });


 export type CreateEquipmentSchema = z.infer<typeof createEquipmentSchema>;