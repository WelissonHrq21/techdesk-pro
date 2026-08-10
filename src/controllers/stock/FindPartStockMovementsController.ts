import { Request, Response } from "express";
import { FindPartStockMovementsService } from "../../services/stock/FindPartStockMovementsService";

type StockMovementParams = {
  id: string;
};

class FindPartStockMovementsController {
  async handle(
    request: Request,
    response: Response
  ) {
    const { id } = request.params as { id: string };

    const findPartStockMovementsService =
      new FindPartStockMovementsService();

    const movements = await findPartStockMovementsService.execute(id);

    return response.status(200).json(movements);
  }
}

export { FindPartStockMovementsController };
