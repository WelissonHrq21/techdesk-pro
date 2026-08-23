import { ServiceOrderStatus } from "@prisma/client";
import { StockMovementRepository } from "../../repositories/StockMovementRepository";
import { serializePart } from "../../utils/stockStatus";

type ReverseStockMovementData = {
  movementId: string;
  quantity: number;
  reason: string;
  userId: string;
};

const reversalAllowedStatuses = [
  ServiceOrderStatus.IN_MAINTENANCE,
  ServiceOrderStatus.FINISHED,
];

class ReverseStockMovementService {
  async execute(data: ReverseStockMovementData) {
    const stockMovementRepository = new StockMovementRepository();

    const result = await stockMovementRepository.reverseExitMovement({
      ...data,
      allowedStatuses: reversalAllowedStatuses,
    });

    return {
      ...result,
      part: serializePart(result.part),
    };
  }
}

export { ReverseStockMovementService, reversalAllowedStatuses };
