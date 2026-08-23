import { Router } from "express";
import { CreateSessionController } from "../controllers/session/CreateSessionController";
import { GetProfileController } from "../controllers/session/GetProfileController";
import { ChangeOwnPasswordController } from "../controllers/session/ChangeOwnPasswordController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { createClientRateLimiter } from "../middlewares/createClientRateLimiter";

const sessionRouter = Router();

const createSessionController = new CreateSessionController();
const getProfileController = new GetProfileController();
const changeOwnPasswordController = new ChangeOwnPasswordController();

const sessionRateLimiter = createClientRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 20,
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

sessionRouter.put(
  "/me/password",
  ensureAuthenticated,
  async (request, response) => {
    return changeOwnPasswordController.handle(request, response);
  }
);

export { sessionRouter };
