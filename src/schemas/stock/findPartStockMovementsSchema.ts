import { StockMovementType } from "@prisma/client";
import { z } from "zod";
import {
  dateQuerySchema,
  limitQuerySchema,
  pageQuerySchema,
} from "../shared/paginationQuerySchema";

const historyDateSchema = dateQuerySchema.refine(
  (value) => {
    if (!value) {
      return true;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  },
  { message: "Date is invalid" }
);

export const findPartStockMovementsSchema = z
  .object({
    page: pageQuerySchema,
    limit: limitQuerySchema,
    type: z.nativeEnum(StockMovementType).optional(),
    dateFrom: historyDateSchema,
    dateTo: historyDateSchema,
  })
  .strict()
  .refine(
    (data) => {
      if (!data.dateFrom || !data.dateTo) {
        return true;
      }

      return (
        new Date(`${data.dateFrom}T00:00:00.000Z`) <=
        new Date(`${data.dateTo}T23:59:59.999Z`)
      );
    },
    {
      message: "dateFrom must be before or equal to dateTo",
      path: ["dateFrom"],
    }
  );

export type FindPartStockMovementsSchema = z.infer<
  typeof findPartStockMovementsSchema
>;
