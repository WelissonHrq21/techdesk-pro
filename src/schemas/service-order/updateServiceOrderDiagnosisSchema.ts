import { z } from "zod";

export const updateServiceOrderDiagnosisSchema = z.object({
  diagnosis: z
    .string()
    .trim()
    .min(1, {
      message: "Diagnosis is required",
    })
    .max(2000, {
      message: "Diagnosis must be less than 2000 characters",
    }),
}).strict();

export type UpdateServiceOrderDiagnosisSchema = z.infer<
  typeof updateServiceOrderDiagnosisSchema
>;
