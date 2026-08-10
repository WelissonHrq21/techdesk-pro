import { z } from "zod";
import {
  limitQuerySchema,
  pageQuerySchema,
  searchQuerySchema,
  uuidQuerySchema,
} from "../shared/paginationQuerySchema";

export const findEquipmentsSchema = z.object({
  page: pageQuerySchema,
  limit: limitQuerySchema,
  search: searchQuerySchema,
  customerId: uuidQuerySchema,
}).strict();

export type FindEquipmentsSchema = z.infer<
  typeof findEquipmentsSchema
>;
