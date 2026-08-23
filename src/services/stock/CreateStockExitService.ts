import { AppError } from "../../errors/AppError";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";
import { StockMovementRepository } from "../../repositories/StockMovementRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { serializePart } from "../../utils/stockStatus";

type CreateStockExitData = {
  partId: string;
  quantity: number;
  reason?: string;
  serviceOrderId?: string;
  userId?: string;
};

class CreateStockExitService {
  async execute(data: CreateStockExitData) {
    const stockMovementRepository = new StockMovementRepository();

    if (data.serviceOrderId) {
      const serviceOrderRepository = new ServiceOrderRepository();
      const serviceOrder = await serviceOrderRepository.findById(
        data.serviceOrderId
      );

      if (!serviceOrder) {
        throw new AppError("Service order not found", 404);
      }
    }

    if (data.userId) {
      const userRepository = new UserRepository();
      const user = await userRepository.findById(data.userId);

      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (!user.active) {
        throw new AppError("User is inactive", 400);
      }
    }

    const result = await stockMovementRepository.createExit(data);

    return {
      ...result,
      part: serializePart(result.part),
    };
  }
}

export { CreateStockExitService };
