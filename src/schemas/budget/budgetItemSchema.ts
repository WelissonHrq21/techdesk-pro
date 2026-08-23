import { BudgetItemType } from "@prisma/client";
import { z } from "zod";

const quantitySchema = z
  .number()
  .int({ message: "Quantity must be an integer" })
  .min(1, { message: "Quantity must be at least 1" });

const unitPriceSchema = z
  .number()
  .positive({ message: "Unit price must be positive" });

const partBudgetItemSchema = z
  .object({
    type: z.literal(BudgetItemType.PART).default(BudgetItemType.PART),
    partId: z.uuid({
      message: "Part ID is invalid",
    }),
    quantity: quantitySchema,
    unitPrice: unitPriceSchema,
  })
  .strict();

const serviceBudgetItemSchema = z
  .object({
    type: z.literal(BudgetItemType.SERVICE),
    partId: z.null().optional(),
    description: z
      .string()
      .trim()
      .min(1, { message: "Description is required for SERVICE items" })
      .max(200, {
        message: "Description must be less than 200 characters",
      }),
    quantity: quantitySchema,
    unitPrice: unitPriceSchema,
  })
  .strict();

export const budgetItemSchema = z.union([
  partBudgetItemSchema,
  serviceBudgetItemSchema,
]);
