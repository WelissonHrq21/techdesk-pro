import { z } from "zod";

export const companySettingsSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da assistencia.").max(120),
  document: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.email().safeParse(value).success, {
      message: "E-mail invalido.",
    }),
  zipCode: z.string().trim().max(20).optional(),
  address: z.string().trim().max(200).optional(),
});

export type CompanySettingsSchemaData = z.infer<
  typeof companySettingsSchema
>;
