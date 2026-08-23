import { BudgetItemType, ServiceOrderStatus } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { BudgetRepository } from "../../repositories/BudgetRepository";
import { PartRepository } from "../../repositories/PartRepository";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";
import { StockMovementRepository } from "../../repositories/StockMovementRepository";
import { UserRepository } from "../../repositories/UserRepository";

type ConsumePartData = {
  serviceOrderId: string;
  partId: string;
  quantity: number;
  userId?: string;
  observation?: string;
};

class ConsumePartService {
  async execute({
    serviceOrderId,
    partId,
    quantity,
    userId,
    observation,
  }: ConsumePartData) {
    const budgetRepository = new BudgetRepository();
    const partRepository = new PartRepository();
    const serviceOrderRepository = new ServiceOrderRepository();
    const stockMovementRepository = new StockMovementRepository();

    const serviceOrder = await serviceOrderRepository.findById(
      serviceOrderId
    );

    if (!serviceOrder) {
      throw new AppError("Service order not found", 404);
    }

    if (serviceOrder.status !== ServiceOrderStatus.IN_MAINTENANCE) {
      throw new AppError(
        "Parts can only be consumed while the service order is in maintenance",
        400
      );
    }

    const part = await partRepository.findById(partId);

    if (!part) {
      throw new AppError("Part not found", 404);
    }

    if (!part.active) {
      throw new AppError("Part is inactive", 400);
    }

    if (userId) {
      const userRepository = new UserRepository();
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (!user.active) {
        throw new AppError("User is inactive", 400);
      }
    }

    const latestBudget =
      await budgetRepository.findLatestWithItemsByServiceOrderId(
        serviceOrderId
      );

    if (!latestBudget) {
      throw new AppError(
        "Service order does not have an approved budget",
        400
      );
    }

    const approvedQuantity = latestBudget.budgetItems.reduce(
      (total, item) => {
        if (
          item.type !== BudgetItemType.PART ||
          item.partId !== partId
        ) {
          return total;
        }

        return total + item.quantity;
      },
      0
    );

    if (approvedQuantity === 0) {
      throw new AppError(
        "Part is not included in the approved budget",
        409
      );
    }

    return stockMovementRepository.createServiceOrderExit({
      partId,
      quantity,
      serviceOrderId,
      approvedQuantity,
      userId,
      reason: observation ?? "Part consumed during service order",
    });
  }
}

export { ConsumePartService };
