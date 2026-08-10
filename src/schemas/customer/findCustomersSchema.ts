import { z } from "zod";
import {
  limitQuerySchema,
  pageQuerySchema,
  searchQuerySchema,
} from "../shared/paginationQuerySchema";

export const findCustomersSchema = z.object({
  page: pageQuerySchema,
  limit: limitQuerySchema,
  search: searchQuerySchema,
}).strict();

export type FindCustomersSchema = z.infer<typeof findCustomersSchema>;
