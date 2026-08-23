import { z } from "zod";
import {
  limitQuerySchema,
  pageQuerySchema,
  searchQuerySchema,
} from "../shared/paginationQuerySchema";
import { stockStatusValues } from "../../utils/stockStatus";

export const findPartsSchema = z.object({
  page: pageQuerySchema,
  limit: limitQuerySchema,
  search: searchQuerySchema,
  stockStatus: z.enum(stockStatusValues).optional(),
  maxStock: z.coerce
    .number()
    .int({ message: "Max stock must be an integer" })
    .min(0, { message: "Max stock must be at least 0" })
    .optional(),
}).strict();

export type FindPartsSchema = z.infer<typeof findPartsSchema>;
