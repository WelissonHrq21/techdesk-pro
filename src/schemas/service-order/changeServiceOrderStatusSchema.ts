import { ServiceOrderStatus } from "@prisma/client";
import { z } from "zod";

export const changeServiceOrderStatusSchema = z.object({
  status: z.nativeEnum(ServiceOrderStatus),

  observation: z
    .string()
    .trim()
    .max(500, {
      message: "Observation must be less than 500 characters",
    })
    .optional(),
}).strict();
