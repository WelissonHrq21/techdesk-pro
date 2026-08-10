import { Request, Response } from "express";
import { findServiceOrdersSchema } from "../../schemas/service-order/findServiceOrdersSchema";
import { FindServiceOrdersService } from "../../services/service-order/FindServiceOrdersService";

class FindServiceOrdersController {
  async handle(request: Request, response: Response) {
    const query = findServiceOrdersSchema.parse(request.query);

    const findServiceOrdersService = new FindServiceOrdersService();

    const serviceOrders = await findServiceOrdersService.execute(query);

    return response.status(200).json(serviceOrders);
  }
}

export { FindServiceOrdersController };
