import "dotenv/config";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://postgres:postgres@127.0.0.1:5433/techdesk_test?schema=public";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ??
  "test-secret-with-at-least-thirty-two-characters";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "8h";
process.env.CORS_ORIGIN =
  process.env.CORS_ORIGIN ?? "http://localhost:5173";
