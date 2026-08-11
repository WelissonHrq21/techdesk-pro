import { Router } from "express";
import rateLimit from "express-rate-limit";
import { FindPublicServiceOrderController } from "../controllers/public/FindPublicServiceOrderController";

const publicRouter = Router();

const findPublicServiceOrderController =
  new FindPublicServiceOrderController();

const publicServiceOrderRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
});

publicRouter.get(
  "/public/service-orders/:token",
  publicServiceOrderRateLimiter,
  async (request, response) => {
    return findPublicServiceOrderController.handle(request, response);
  }
);

export { publicRouter };
