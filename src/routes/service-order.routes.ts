import { Router } from "express";
import { UserRole } from "@prisma/client";
import { CreateServiceOrderController } from "../controllers/service-order/CreateServiceOrderController";
import { FindServiceOrderController } from "../controllers/service-order/FindServiceOrderController";
import { FindServiceOrdersController } from "../controllers/service-order/FindServiceOrdersController";

import { ChangeServiceOrderStatusController } from "../controllers/service-order/ChangeServiceOrderStatusController";
import { ConsumePartController } from "../controllers/service-order/ConsumePartController";
import { UpdateServiceOrderDiagnosisController } from "../controllers/service-order/UpdateServiceOrderDiagnosisController";
import { authorizeRoles } from "../middlewares/authorizeRoles";

const serviceOrderRouter = Router();

const createServiceOrderController =
  new CreateServiceOrderController();

const changeServiceOrderStatusController = new ChangeServiceOrderStatusController();

const consumePartController = new ConsumePartController();

const findServiceOrderController = new FindServiceOrderController();
const findServiceOrdersController = new FindServiceOrdersController();

const updateServiceOrderDiagnosisController =
  new UpdateServiceOrderDiagnosisController();

const allRoles = authorizeRoles(
  UserRole.ADMIN,
  UserRole.RECEPTION,
  UserRole.TECHNICIAN
);
const adminOrTechnician = authorizeRoles(
  UserRole.ADMIN,
  UserRole.TECHNICIAN
);

serviceOrderRouter.post(
  "/service-orders",
  allRoles,
  async (request, response) => {
    return createServiceOrderController.handle(request, response);
  }
);

serviceOrderRouter.get(
  "/service-orders",
  allRoles,
  async (request, response) => {
    return findServiceOrdersController.handle(request, response);
  }
);

serviceOrderRouter.get(
  "/service-orders/:id",
  allRoles,
  async (request, response) => {
    return findServiceOrderController.handle(request, response);
  }
);

serviceOrderRouter.patch(
  "/service-orders/:id/status",
  allRoles,
  async (request, response) => {
    return changeServiceOrderStatusController.handle(
      request,
      response
    );
  }
);

serviceOrderRouter.patch(
  "/service-orders/:id/diagnosis",
  adminOrTechnician,
  async (request, response) => {
    return updateServiceOrderDiagnosisController.handle(
      request,
      response
    );
  }
);

serviceOrderRouter.post(
  "/service-orders/:id/parts/:partId/consume",
  adminOrTechnician,
  async (request, response) => {
    return consumePartController.handle(request, response);
  }
);



export { serviceOrderRouter };
