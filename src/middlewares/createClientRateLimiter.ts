import rateLimit from "express-rate-limit";

type ClientRateLimiterOptions = {
  windowMs: number;
  limit: number;
};

export function createClientRateLimiter({
  windowMs,
  limit,
}: ClientRateLimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
  });
}
