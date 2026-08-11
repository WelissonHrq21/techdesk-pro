import { Request, Response } from "express";
import { FindPublicServiceOrderService } from "../../services/public/FindPublicServiceOrderService";

class FindPublicServiceOrderController {
  async handle(request: Request, response: Response) {
    const { token } = request.params as { token: string };
    const findPublicServiceOrderService =
      new FindPublicServiceOrderService();
    const serviceOrder = await findPublicServiceOrderService.execute(token);

    return response.status(200).json(serviceOrder);
  }
}

export { FindPublicServiceOrderController };
