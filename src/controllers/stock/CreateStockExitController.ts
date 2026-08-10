import { Request, Response } from "express";
import { createStockExitSchema } from "../../schemas/stock/createStockExitSchema";
import { CreateStockExitService } from "../../services/stock/CreateStockExitService";

type StockParams = {
  id: string;
};

class CreateStockExitController {
  async handle(request: Request, response: Response) {
    const { id } = request.params as { id: string };
    const data = createStockExitSchema.parse(request.body);

    const createStockExitService = new CreateStockExitService();

    const result = await createStockExitService.execute({
      partId: id,
      ...data,
      userId: request.user.id,
    });

    return response.status(201).json(result);
  }
}

export { CreateStockExitController };
