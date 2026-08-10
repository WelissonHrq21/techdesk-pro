import { UserRole } from "@prisma/client";
import { Router } from "express";
import { DashboardController } from "../controllers/dashboard/DashboardController";
import { authorizeRoles } from "../middlewares/authorizeRoles";

const dashboardRouter = Router();
const dashboardController = new DashboardController();

const allRoles = authorizeRoles(
  UserRole.ADMIN,
  UserRole.RECEPTION,
  UserRole.TECHNICIAN
);

dashboardRouter.get(
  "/dashboard/summary",
  allRoles,
  async (request, response) => {
    return dashboardController.handle(request, response);
  }
);

export { dashboardRouter };
