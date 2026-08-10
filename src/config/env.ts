import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().trim().min(1, {
    message: "DATABASE_URL is required",
  }),
  JWT_SECRET: z.string().min(32, {
    message: "JWT_SECRET must have at least 32 characters",
  }),
  JWT_EXPIRES_IN: z.string().trim().min(1).default("8h"),
  CORS_ORIGIN: z.string().trim().min(1).default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);
