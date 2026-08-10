import { ServiceOrderStatus } from "@prisma/client";
import { z } from "zod";
import {
  dateQuerySchema,
  limitQuerySchema,
  pageQuerySchema,
  searchQuerySchema,
  uuidQuerySchema,
} from "../shared/paginationQuerySchema";

const statusQuerySchema = z
  .preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    return value.split(",").map((status) => status.trim());
  }, z.array(z.nativeEnum(ServiceOrderStatus)).min(1))
  .optional();

export const findServiceOrdersSchema = z.object({
  page: pageQuerySchema,
  limit: limitQuerySchema,
  status: statusQuerySchema,
  search: searchQuerySchema,
  dateFrom: dateQuerySchema,
  dateTo: dateQuerySchema,
  customerId: uuidQuerySchema,
  equipmentId: uuidQuerySchema,
  sortBy: z
    .enum(["createdAt", "updatedAt", "number"])
    .default("createdAt"),
  sortOrder: z
    .enum(["asc", "desc"])
    .default("desc"),
}).strict().refine((data) => {
  if (!data.dateFrom || !data.dateTo) {
    return true;
  }

  return (
    new Date(`${data.dateFrom}T00:00:00.000Z`) <=
    new Date(`${data.dateTo}T23:59:59.999Z`)
  );
}, {
  message: "dateFrom must be before or equal to dateTo",
  path: ["dateFrom"],
});

export type FindServiceOrdersSchema = z.infer<
  typeof findServiceOrdersSchema
>;
