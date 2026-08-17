import pino from "pino";
import { randomUUID } from "node:crypto";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.body.password",
      "req.body.document",
      "request.headers.authorization",
      "request.body.password",
      "request.body.document",
      "password",
      "token",
      "document",
    ],
    censor: "[REDACTED]",
  },
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
});

export function createRequestId() {
  return randomUUID();
}
