import { Request, Response } from "express";
import { reverseStockMovementSchema } from "../../schemas/stock/reverseStockMovementSchema";
import { ReverseStockMovementService } from "../../services/stock/ReverseStockMovementService";

class ReverseStockMovementController {
  async handle(request: Request, response: Response) {
    const { id } = request.params as { id: string };
    const data = reverseStockMovementSchema.parse(request.body);

    const reverseStockMovementService =
      new ReverseStockMovementService();

    const result = await reverseStockMovementService.execute({
      movementId: id,
      ...data,
      userId: request.user.id,
    });

    return response.status(201).json(result);
  }
}

export { ReverseStockMovementController };
