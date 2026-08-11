import { z } from "zod";

export const updateCompanySettingsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required" })
      .max(120, { message: "Name must be less than 120 characters" }),
    document: z
      .string()
      .trim()
      .max(50, { message: "Document must be less than 50 characters" })
      .optional(),
    phone: z
      .string()
      .trim()
      .max(30, { message: "Phone must be less than 30 characters" })
      .optional(),
    email: z
      .string()
      .trim()
      .email({ message: "Email is invalid" })
      .max(120, { message: "Email must be less than 120 characters" })
      .optional(),
    address: z
      .string()
      .trim()
      .max(200, { message: "Address must be less than 200 characters" })
      .optional(),
    zipCode: z
      .string()
      .trim()
      .max(20, { message: "Zip code must be less than 20 characters" })
      .optional(),
  })
  .strict();

export type UpdateCompanySettingsSchema = z.infer<
  typeof updateCompanySettingsSchema
>;
