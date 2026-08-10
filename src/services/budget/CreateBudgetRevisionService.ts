import { ServiceOrderStatus } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { BudgetRepository } from "../../repositories/BudgetRepository";
import { PartRepository } from "../../repositories/PartRepository";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";
import { StockMovementRepository } from "../../repositories/StockMovementRepository";
import { UserRepository } from "../../repositories/UserRepository";

type CreateBudgetRevisionData = {
  serviceOrderId: string;
  items: Array<{
    partId: string;
    quantity: number;
    unitPrice: number;
  }>;
  observation?: string;
  userId?: string;
};

class CreateBudgetRevisionService {
  async execute(data: CreateBudgetRevisionData) {
    const budgetRepository = new BudgetRepository();
    const partRepository = new PartRepository();
    const serviceOrderRepository = new ServiceOrderRepository();
    const stockMovementRepository = new StockMovementRepository();

    const serviceOrder = await serviceOrderRepository.findById(
      data.serviceOrderId
    );

    if (!serviceOrder) {
      throw new AppError("Service order not found", 404);
    }

    if (serviceOrder.status !== ServiceOrderStatus.IN_MAINTENANCE) {
      throw new AppError(
        "Budget revision can only be created during maintenance",
        400
      );
    }

    const lastVersion =
      await budgetRepository.findLastVersionByServiceOrderId(
        data.serviceOrderId
      );

    if (!lastVersion) {
      throw new AppError(
        "Service order has no previous budget to revise",
        400
      );
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

    for (const item of data.items) {
      if (item.quantity <= 0) {
        throw new AppError("Quantity must be greater than zero", 400);
      }

      if (item.unitPrice <= 0) {
        throw new AppError("Unit price must be greater than zero", 400);
      }

      const part = await partRepository.findById(item.partId);

      if (!part) {
        throw new AppError("Part not found", 404);
      }

      if (!part.active) {
        throw new AppError("Part is inactive", 400);
      }
    }

    const revisionItemsByPartId = new Map(
      data.items.map((item) => [item.partId, item])
    );

    const consumedParts =
      await stockMovementRepository.findConsumedPartsByServiceOrder(
        data.serviceOrderId
      );

    for (const consumedPart of consumedParts) {
      const revisionItem = revisionItemsByPartId.get(
        consumedPart.partId
      );

      if (!revisionItem) {
        throw new AppError(
          "Revised budget cannot remove a part already consumed",
          409
        );
      }

      if (revisionItem.quantity < consumedPart.consumed) {
        throw new AppError(
          "Revised budget quantity cannot be lower than already consumed quantity",
          409
        );
      }
    }

    const totalValue = data.items.reduce((total, item) => {
      return total + item.quantity * item.unitPrice;
    }, 0);

    return budgetRepository.createRevision({
      serviceOrderId: data.serviceOrderId,
      version: lastVersion.version + 1,
      totalValue,
      items: data.items,
      previousStatus: serviceOrder.status,
      userId: data.userId,
      observation: data.observation,
    });
  }
}

export { CreateBudgetRevisionService };
