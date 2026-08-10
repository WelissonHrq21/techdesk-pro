import { Router } from "express";
import { prisma } from "../config/prisma";

const healthRouter = Router();

healthRouter.get("/health", (request, response) => {
  return response.status(200).json({
    status: "ok",
  });
});

healthRouter.get("/ready", async (request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return response.status(200).json({
      status: "ready",
    });
  } catch {
    return response.status(503).json({
      status: "not_ready",
    });
  }
});

export { healthRouter };
