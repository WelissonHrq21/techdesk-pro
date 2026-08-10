import { Router } from "express";
import { UserRole } from "@prisma/client";
import { CreateStockEntryController } from "../controllers/stock/CreateStockEntryController";
import { CreateStockExitController } from "../controllers/stock/CreateStockExitController";
import { FindPartStockMovementsController } from "../controllers/stock/FindPartStockMovementsController";
import { authorizeRoles } from "../middlewares/authorizeRoles";

const stockRouter = Router();

const createStockEntryController = new CreateStockEntryController();
const createStockExitController = new CreateStockExitController();
const findPartStockMovementsController =
  new FindPartStockMovementsController();

const allRoles = authorizeRoles(
  UserRole.ADMIN,
  UserRole.RECEPTION,
  UserRole.TECHNICIAN
);
const adminOnly = authorizeRoles(UserRole.ADMIN);

stockRouter.post(
  "/parts/:id/stock/entry",
  adminOnly,
  async (request, response) => {
    return createStockEntryController.handle(request, response);
  }
);

stockRouter.post(
  "/parts/:id/stock/exit",
  adminOnly,
  async (request, response) => {
    return createStockExitController.handle(request, response);
  }
);

stockRouter.get(
  "/parts/:id/stock-movements",
  allRoles,
  async (request, response) => {
    return findPartStockMovementsController.handle(request, response);
  }
);

export { stockRouter };
