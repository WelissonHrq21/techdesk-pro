import { Request, Response } from "express";
import { createServiceOrderSchema } from "../../schemas/service-order/createServiceOrderSchema";
import { CreateServiceOrderService } from "../../services/service-order/CreateServiceOrderService";

class CreateServiceOrderController {
  async handle(request: Request, response: Response) {
    const data = createServiceOrderSchema.parse(request.body);

    const createServiceOrderService = new CreateServiceOrderService();

    const serviceOrder = await createServiceOrderService.execute({
      ...data,
      userId: request.user.id,
    });

    return response.status(201).json(serviceOrder);
  }
}

export { CreateServiceOrderController };
