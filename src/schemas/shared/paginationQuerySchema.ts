import { z } from "zod";

export const pageQuerySchema = z.coerce
  .number()
  .int({ message: "Page must be an integer" })
  .min(1, { message: "Page must be at least 1" })
  .default(1);

export const limitQuerySchema = z.coerce
  .number()
  .int({ message: "Limit must be an integer" })
  .min(1, { message: "Limit must be at least 1" })
  .max(100, { message: "Limit must be at most 100" })
  .default(20);

export const searchQuerySchema = z
  .string()
  .trim()
  .min(1)
  .optional();

export const uuidQuerySchema = z
  .uuid({ message: "ID is invalid" })
  .optional();

export const dateQuerySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Date must be in YYYY-MM-DD format",
  })
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), {
    message: "Date is invalid",
  })
  .optional();
