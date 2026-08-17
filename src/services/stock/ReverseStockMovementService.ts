import { ServiceOrderStatus } from "@prisma/client";
import { StockMovementRepository } from "../../repositories/StockMovementRepository";

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

    return stockMovementRepository.reverseExitMovement({
      ...data,
      allowedStatuses: reversalAllowedStatuses,
    });
  }
}

export { ReverseStockMovementService, reversalAllowedStatuses };
