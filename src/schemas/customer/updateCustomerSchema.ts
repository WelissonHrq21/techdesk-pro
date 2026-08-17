import { createCustomerSchema } from "./createCustomerSchema";
import { z } from "zod";

export const updateCustomerSchema = createCustomerSchema.partial().strict();

export type UpdateCustomerSchema = z.infer<typeof updateCustomerSchema>;
