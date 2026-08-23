import { Router } from "express";
import { FindPublicServiceOrderController } from "../controllers/public/FindPublicServiceOrderController";
import { createClientRateLimiter } from "../middlewares/createClientRateLimiter";

const publicRouter = Router();

const findPublicServiceOrderController =
  new FindPublicServiceOrderController();

const publicServiceOrderRateLimiter = createClientRateLimiter({
  windowMs: 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 60,
});

publicRouter.get(
  "/public/service-orders/:token",
  publicServiceOrderRateLimiter,
  async (request, response) => {
    return findPublicServiceOrderController.handle(request, response);
  }
);

export { publicRouter };
