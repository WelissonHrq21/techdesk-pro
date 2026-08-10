import { z } from "zod";

export const createCustomerSchema = z.object({
    name: z.string().trim().min(1, {message: "name is required"}).max(100, {message: "name must be less than 100 characters"}),
    phone: z.string().trim().min(1, {message: "phone is required"}).max(20, {message: "phone must be less than 20 characters"}),
    email: z.string().email({message: "email must be a valid email address"}).max(100, {message: "email must be less than 100 characters"}).optional(),
    zipCode: z.string().max(10, {message: "zipCode must be less than 10 characters"}).optional(),
    address: z.string().max(200, {message: "address must be less than 200 characters"}).optional()

});

export type CreateCustomerSchema = z.infer<typeof createCustomerSchema>;