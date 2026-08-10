import { Router } from "express";
import { UserRole } from "@prisma/client";
import { CreateUserController } from "../controllers/user/CreateUserController";
import { DeactivateUserController } from "../controllers/user/DeactivateUserController";
import { FindUserController } from "../controllers/user/FindUserController";
import { FindUsersController } from "../controllers/user/FindUsersController";
import { UpdateUserController } from "../controllers/user/UpdateUserController";
import { authorizeRoles } from "../middlewares/authorizeRoles";

const userRouter = Router();

const createUserController = new CreateUserController();
const deactivateUserController = new DeactivateUserController();
const findUserController = new FindUserController();
const findUsersController = new FindUsersController();
const updateUserController = new UpdateUserController();

const adminOnly = authorizeRoles(UserRole.ADMIN);

userRouter.post("/users", adminOnly, async (request, response) => {
  return createUserController.handle(request, response);
});

userRouter.get("/users", adminOnly, async (request, response) => {
  return findUsersController.handle(request, response);
});

userRouter.get("/users/:id", adminOnly, async (request, response) => {
  return findUserController.handle(request, response);
});

userRouter.put("/users/:id", adminOnly, async (request, response) => {
  return updateUserController.handle(request, response);
});

userRouter.delete("/users/:id", adminOnly, async (request, response) => {
  return deactivateUserController.handle(request, response);
});

export { userRouter };
