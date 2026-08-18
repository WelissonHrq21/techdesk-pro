import { Router } from "express";
import { UserRole } from "@prisma/client";
import { CompleteSetupController } from "../controllers/setup/CompleteSetupController";
import { CreateSetupUserController } from "../controllers/setup/CreateSetupUserController";
import { GetSetupStatusController } from "../controllers/setup/GetSetupStatusController";
import { UpdateSetupAdminController } from "../controllers/setup/UpdateSetupAdminController";
import { UpdateSetupCompanyController } from "../controllers/setup/UpdateSetupCompanyController";
import { authorizeRoles } from "../middlewares/authorizeRoles";

const setupRouter = Router();

const adminOnly = authorizeRoles(UserRole.ADMIN);
const getSetupStatusController = new GetSetupStatusController();
const updateSetupCompanyController = new UpdateSetupCompanyController();
const updateSetupAdminController = new UpdateSetupAdminController();
const createSetupUserController = new CreateSetupUserController();
const completeSetupController = new CompleteSetupController();

setupRouter.get("/setup/status", adminOnly, async (request, response) => {
  return getSetupStatusController.handle(request, response);
});

setupRouter.patch("/setup/company", adminOnly, async (request, response) => {
  return updateSetupCompanyController.handle(request, response);
});

setupRouter.patch("/setup/admin", adminOnly, async (request, response) => {
  return updateSetupAdminController.handle(request, response);
});

setupRouter.post("/setup/users", adminOnly, async (request, response) => {
  return createSetupUserController.handle(request, response);
});

setupRouter.post("/setup/complete", adminOnly, async (request, response) => {
  return completeSetupController.handle(request, response);
});

export { setupRouter };
