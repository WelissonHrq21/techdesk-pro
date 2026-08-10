import { Request, Response } from "express";
import { createStockEntrySchema } from "../../schemas/stock/createStockEntrySchema";
import { CreateStockEntryService } from "../../services/stock/CreateStockEntryService";

type StockParams = {
  id: string;
};

class CreateStockEntryController {
  async handle(request: Request, response: Response) {
    const { id } = request.params as { id: string };
    const data = createStockEntrySchema.parse(request.body);

    const createStockEntryService = new CreateStockEntryService();

    const result = await createStockEntryService.execute({
      partId: id,
      ...data,
      userId: request.user.id,
    });

    return response.status(201).json(result);
  }
}

export { CreateStockEntryController };
