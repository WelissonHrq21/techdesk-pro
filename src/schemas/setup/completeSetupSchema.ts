import { z } from "zod";

export const completeSetupSchema = z
  .object({
    backupAcknowledged: z.literal(true, {
      message: "backupAcknowledged must be true",
    }),
  })
  .strict();

export type CompleteSetupSchema = z.infer<typeof completeSetupSchema>;
