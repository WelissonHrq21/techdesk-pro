import type { Express } from "express";

export const TRUSTED_PROXY_HOPS = 1;

export function configureTrustProxy(app: Express) {
  app.set("trust proxy", TRUSTED_PROXY_HOPS);
}
