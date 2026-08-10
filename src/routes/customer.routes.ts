import { Router } from "express";
import { UserRole } from "@prisma/client";
import { CreateCustomerController } from "../controllers/customer/CreateCustomerController";
import { FindCustomersController } from "../controllers/customer/FindCustomersController";
import { FindCustomerController } from "../controllers/customer/FindCustomerController";
import { UpdateCustomerController } from "../controllers/customer/UpdateCustomerController";
import { DeactivateCustomerController } from "../controllers/customer/DeactivateCustomerController";
import { authorizeRoles } from "../middlewares/authorizeRoles";

const customerRouter = Router();
const createCustomerController = new CreateCustomerController();
const findCustomersController = new FindCustomersController();
const findCustomerController = new FindCustomerController();
const updateCustomerController = new UpdateCustomerController();
const deactivateCustomerController = new DeactivateCustomerController();

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

customerRouter.post("/customers", adminOrReception, async(request, response) => {
    return createCustomerController.handle(request, response);
});
customerRouter.get("/customers", allRoles, async(request, response) => {
    return findCustomersController.handle(request, response);
});
customerRouter.get("/customers/:id", allRoles, async(request, response) => {
    return findCustomerController.handle(request, response);
});
customerRouter.put("/customers/:id", adminOrReception, async(request, response) => {
    return updateCustomerController.handle(request, response);
});
customerRouter.delete("/customers/:id", adminOnly, async(request, response) => {
    return deactivateCustomerController.handle(request, response);
});

export { customerRouter };
