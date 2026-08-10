import { AppError } from "../../errors/AppError";
import { PartRepository } from "../../repositories/PartRepository";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";
import { StockMovementRepository } from "../../repositories/StockMovementRepository";
import { UserRepository } from "../../repositories/UserRepository";

type CreateStockExitData = {
  partId: string;
  quantity: number;
  reason?: string;
  serviceOrderId?: string;
  userId?: string;
};

class CreateStockExitService {
  async execute(data: CreateStockExitData) {
    const partRepository = new PartRepository();
    const stockMovementRepository = new StockMovementRepository();

    const part = await partRepository.findById(data.partId);

    if (!part) {
      throw new AppError("Part not found", 404);
    }

    if (!part.active) {
      throw new AppError("Part is inactive", 400);
    }

    if (part.stock < data.quantity) {
      throw new AppError("Insufficient stock", 400);
    }

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

    return stockMovementRepository.createExit(data);
  }
}

export { CreateStockExitService };
