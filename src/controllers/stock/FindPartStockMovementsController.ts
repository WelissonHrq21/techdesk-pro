import { Request, Response } from "express";
import { FindPartStockMovementsService } from "../../services/stock/FindPartStockMovementsService";
import { findPartStockMovementsSchema } from "../../schemas/stock/findPartStockMovementsSchema";

class FindPartStockMovementsController {
  async handle(
    request: Request,
    response: Response
  ) {
    const { id } = request.params as { id: string };
    const query = findPartStockMovementsSchema.parse(request.query);

    const findPartStockMovementsService =
      new FindPartStockMovementsService();

    const movements = await findPartStockMovementsService.execute(
      id,
      query
    );

    return response.status(200).json(movements);
  }
}

export { FindPartStockMovementsController };
