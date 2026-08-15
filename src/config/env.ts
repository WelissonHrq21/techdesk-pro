import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().trim().min(1, {
    message: "DATABASE_URL is required",
  }),
  JWT_SECRET: z.string().min(32, {
    message: "JWT_SECRET must have at least 32 characters",
  }),
  JWT_EXPIRES_IN: z.string().trim().min(1).default("8h"),
  CORS_ORIGIN: z
    .string()
    .trim()
    .min(1)
    .default("http://localhost:5173")
    .transform((value: string) => {
      return value.split(",").map((origin) => origin.trim());
    }),
  SWAGGER_ENABLED: z
    .string()
    .trim()
    .toLowerCase()
    .default(process.env.NODE_ENV === "production" ? "false" : "true")
    .transform((value: string) => value === "true"),
});

export const env = envSchema.parse(process.env);
