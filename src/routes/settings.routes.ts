import { Router } from "express";
import { UserRole } from "@prisma/client";
import { FindCompanySettingsController } from "../controllers/settings/FindCompanySettingsController";
import { UpdateCompanySettingsController } from "../controllers/settings/UpdateCompanySettingsController";
import { authorizeRoles } from "../middlewares/authorizeRoles";

const settingsRouter = Router();

const findCompanySettingsController = new FindCompanySettingsController();
const updateCompanySettingsController =
  new UpdateCompanySettingsController();

const allRoles = authorizeRoles(
  UserRole.ADMIN,
  UserRole.RECEPTION,
  UserRole.TECHNICIAN
);
const adminOnly = authorizeRoles(UserRole.ADMIN);

settingsRouter.get(
  "/settings/company",
  allRoles,
  async (request, response) => {
    return findCompanySettingsController.handle(request, response);
  }
);

settingsRouter.put(
  "/settings/company",
  adminOnly,
  async (request, response) => {
    return updateCompanySettingsController.handle(request, response);
  }
);

export { settingsRouter };
