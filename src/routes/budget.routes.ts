import { Router } from "express";
import { UserRole } from "@prisma/client";
import { ApproveBudgetController } from "../controllers/budget/ApproveBudgetController";
import { CreateBudgetController } from "../controllers/budget/CreateBudgetController";
import { CreateBudgetRevisionController } from "../controllers/budget/CreateBudgetRevisionController";
import { RejectBudgetController } from "../controllers/budget/RejectBudgetController";
import { authorizeRoles } from "../middlewares/authorizeRoles";

const budgetRouter = Router();

const approveBudgetController = new ApproveBudgetController();
const createBudgetController = new CreateBudgetController();
const createBudgetRevisionController =
  new CreateBudgetRevisionController();
const rejectBudgetController = new RejectBudgetController();

const adminOrTechnician = authorizeRoles(
  UserRole.ADMIN,
  UserRole.TECHNICIAN
);
const adminOrReception = authorizeRoles(
  UserRole.ADMIN,
  UserRole.RECEPTION
);

budgetRouter.post(
  "/service-orders/:id/budgets",
  adminOrTechnician,
  async (request, response) => {
    return createBudgetController.handle(request, response);
  }
);

budgetRouter.post(
  "/service-orders/:id/budgets/revision",
  adminOrTechnician,
  async (request, response) => {
    return createBudgetRevisionController.handle(request, response);
  }
);

budgetRouter.post(
  "/budgets/:id/approve",
  adminOrReception,
  async (request, response) => {
    return approveBudgetController.handle(request, response);
  }
);

budgetRouter.post(
  "/budgets/:id/reject",
  adminOrReception,
  async (request, response) => {
    return rejectBudgetController.handle(request, response);
  }
);

export { budgetRouter };
