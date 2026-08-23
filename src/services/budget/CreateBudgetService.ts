import { ServiceOrderStatus } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { BudgetRepository } from "../../repositories/BudgetRepository";
import { PartRepository } from "../../repositories/PartRepository";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";
import { BudgetItemInput } from "../../types/budget";
import { prepareBudgetItems } from "./prepareBudgetItems";

type CreateBudgetData = {
  serviceOrderId: string;
  items: BudgetItemInput[];
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

    const items = await prepareBudgetItems(
      data.items,
      partRepository
    );

    const totalValue = items.reduce((total, item) => {
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
      items,
    });
  }
}

export { CreateBudgetService };
