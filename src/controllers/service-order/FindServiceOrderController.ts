import { Request, Response } from "express";
import { FindServiceOrderService } from "../../services/service-order/FindServiceOrderService";

type FindServiceOrderParams = {
  id: string;
};

class FindServiceOrderController {
  async handle(
    request: Request,
    response: Response
  ) {
    const { id } = request.params as { id: string };

    const findServiceOrderService = new FindServiceOrderService();

    const serviceOrder = await findServiceOrderService.execute(id);

    return response.status(200).json(serviceOrder);
  }
}

export { FindServiceOrderController };