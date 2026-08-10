import { ServiceOrderStatus } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { BudgetRepository } from "../../repositories/BudgetRepository";
import { PartRepository } from "../../repositories/PartRepository";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";

type CreateBudgetData = {
  serviceOrderId: string;
  items: Array<{
    partId: string;
    quantity: number;
    unitPrice: number;
  }>;
};

const allowedStatusesToCreateBudget: ServiceOrderStatus[] = [
  ServiceOrderStatus.IN_ANALYSIS,
  ServiceOrderStatus.BUDGET_REJECTED,
];

class CreateBudgetService {
  async execute(data: CreateBudgetData) {
    const serviceOrderRepository = new ServiceOrderRepository();
    const partRepository = new PartRepository();
    const budgetRepository = new BudgetRepository();

    const serviceOrder = await serviceOrderRepository.findById(
      data.serviceOrderId
    );

    if (!serviceOrder) {
      throw new AppError("Service order not found", 404);
    }

    const statusAllowsBudget =
      allowedStatusesToCreateBudget.includes(serviceOrder.status);

    if (!statusAllowsBudget) {
      throw new AppError(
        `Cannot create budget when service order status is ${serviceOrder.status}`,
        400
      );
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

    const totalValue = data.items.reduce((total, item) => {
      return total + item.quantity * item.unitPrice;
    }, 0);

    const lastVersion =
      await budgetRepository.findLastVersionByServiceOrderId(
        data.serviceOrderId
      );

    const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

    return budgetRepository.create({
      serviceOrderId: data.serviceOrderId,
      version: nextVersion,
      totalValue,
      items: data.items,
    });
  }
}

export { CreateBudgetService };
