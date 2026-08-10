import { Request, Response } from "express";
import { consumePartSchema } from "../../schemas/service-order/consumePartSchema";
import { ConsumePartService } from "../../services/service-order/ConsumePartService";

type ConsumePartParams = {
  id: string;
  partId: string;
};

class ConsumePartController {
  async handle(
    request: Request,
    response: Response
  ) {
    const { id, partId } = request.params as { id: string; partId: string };
    const data = consumePartSchema.parse(request.body);

    const consumePartService = new ConsumePartService();

    const result = await consumePartService.execute({
      serviceOrderId: id,
      partId,
      ...data,
      userId: request.user.id,
    });

    return response.status(201).json(result);
  }
}

export { ConsumePartController };
