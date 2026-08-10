import { Router } from "express";
import { UserRole } from "@prisma/client";
import { CreatePartController } from "../controllers/part/CreatePartController";
import { DeactivatePartController } from "../controllers/part/DeactivatePartController";
import { FindPartController } from "../controllers/part/FindPartController";
import { FindPartsController } from "../controllers/part/FindPartsController";
import { UpdatePartController } from "../controllers/part/UpdatePartController";
import { authorizeRoles } from "../middlewares/authorizeRoles";

const partRouter = Router();

const createPartController = new CreatePartController();
const deactivatePartController = new DeactivatePartController();
const findPartController = new FindPartController();
const findPartsController = new FindPartsController();
const updatePartController = new UpdatePartController();

const allRoles = authorizeRoles(
  UserRole.ADMIN,
  UserRole.RECEPTION,
  UserRole.TECHNICIAN
);
const adminOnly = authorizeRoles(UserRole.ADMIN);

partRouter.post("/parts", adminOnly, async (request, response) => {
  return createPartController.handle(request, response);
});

partRouter.get("/parts", allRoles, async (request, response) => {
  return findPartsController.handle(request, response);
});

partRouter.get("/parts/:id", allRoles, async (request, response) => {
  return findPartController.handle(request, response);
});

partRouter.put("/parts/:id", adminOnly, async (request, response) => {
  return updatePartController.handle(request, response);
});

partRouter.delete("/parts/:id", adminOnly, async (request, response) => {
  return deactivatePartController.handle(request, response);
});

export { partRouter };
