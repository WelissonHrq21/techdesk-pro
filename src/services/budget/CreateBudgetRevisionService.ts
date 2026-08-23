import { BudgetItemType, ServiceOrderStatus } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { BudgetRepository } from "../../repositories/BudgetRepository";
import { PartRepository } from "../../repositories/PartRepository";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";
import { StockMovementRepository } from "../../repositories/StockMovementRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { BudgetItemInput } from "../../types/budget";
import { calculateBudgetTotal } from "./calculateBudgetTotal";
import { prepareBudgetItems } from "./prepareBudgetItems";

type CreateBudgetRevisionData = {
  serviceOrderId: string;
  items: BudgetItemInput[];
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

    const items = await prepareBudgetItems(
      data.items,
      partRepository
    );

    const revisionQuantityByPartId = new Map<string, number>();

    for (const item of items) {
      if (item.type !== BudgetItemType.PART || item.partId === null) {
        continue;
      }

      revisionQuantityByPartId.set(
        item.partId,
        (revisionQuantityByPartId.get(item.partId) ?? 0) + item.quantity
      );
    }

    const consumedParts =
      await stockMovementRepository.findConsumedPartsByServiceOrder(
        data.serviceOrderId
      );

    for (const consumedPart of consumedParts) {
      const revisionQuantity = revisionQuantityByPartId.get(
        consumedPart.partId
      );

      if (revisionQuantity === undefined) {
        throw new AppError(
          "Revised budget cannot remove a part already consumed",
          409
        );
      }

      if (revisionQuantity < consumedPart.consumed) {
        throw new AppError(
          "Revised budget quantity cannot be lower than already consumed quantity",
          409
        );
      }
    }

    const totalValue = calculateBudgetTotal(items);

    return budgetRepository.createRevision({
      serviceOrderId: data.serviceOrderId,
      expectedVersion: lastVersion.version,
      expectedStatus: serviceOrder.status,
      totalValue,
      items,
      previousStatus: serviceOrder.status,
      userId: data.userId,
      observation: data.observation,
    });
  }
}

export { CreateBudgetRevisionService };
