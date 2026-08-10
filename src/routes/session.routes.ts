import { Router } from "express";
import rateLimit from "express-rate-limit";
import { CreateSessionController } from "../controllers/session/CreateSessionController";
import { GetProfileController } from "../controllers/session/GetProfileController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";

const sessionRouter = Router();

const createSessionController = new CreateSessionController();
const getProfileController = new GetProfileController();

const sessionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
});

sessionRouter.post(
  "/sessions",
  sessionRateLimiter,
  async (request, response) => {
    return createSessionController.handle(request, response);
  }
);

sessionRouter.get(
  "/me",
  ensureAuthenticated,
  async (request, response) => {
    return getProfileController.handle(request, response);
  }
);

export { sessionRouter };
