import { Router } from "express";
import { UserRole } from "@prisma/client";
import { CreateEquipmentController } from "../controllers/equipment/CreateEquipmentController"
import { FindEquipmentsController } from "../controllers/equipment/FindEquipmentsController"
import { FindEquipmentController } from "../controllers/equipment/FindEquipmentController"
import { UpdateEquipmentController } from "../controllers/equipment/UpdateEquipmentsController"
import { DeactivateEquipmentController } from "../controllers/equipment/DeactivateEquipmentController"
import { authorizeRoles } from "../middlewares/authorizeRoles";

const equipmentRouter = Router();
const createEquipmentController = new CreateEquipmentController();
const findEquipmentsController = new FindEquipmentsController();
const findEquipmentController = new FindEquipmentController();
const updateEquipmentController = new UpdateEquipmentController();
const deactivateEquipmentController = new DeactivateEquipmentController()

const allRoles = authorizeRoles(
    UserRole.ADMIN,
    UserRole.RECEPTION,
    UserRole.TECHNICIAN
);
const adminOrReception = authorizeRoles(
    UserRole.ADMIN,
    UserRole.RECEPTION
);
const adminOnly = authorizeRoles(UserRole.ADMIN);

equipmentRouter.post("/equipments", adminOrReception, async(request, response) => {
    return createEquipmentController.handle(request, response);
});
equipmentRouter.get("/equipments", allRoles, async(request, response) => {
    return findEquipmentsController.handle(request, response);
});
equipmentRouter.get("/equipments/:id", allRoles, async(request, response) => {
    return findEquipmentController.handle(request, response);
});
equipmentRouter.put("/equipments/:id", adminOrReception, async(request, response) => {
    return updateEquipmentController.handle(request, response);
});
equipmentRouter.delete("/equipments/:id", adminOnly, async(request, response) => {
    return deactivateEquipmentController.handle(request, response);
});

export { equipmentRouter };
