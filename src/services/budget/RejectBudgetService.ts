import { ServiceOrderStatus } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { BudgetRepository } from "../../repositories/BudgetRepository";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";
import { UserRepository } from "../../repositories/UserRepository";

type RejectBudgetData = {
  budgetId: string;
  userId?: string;
  observation?: string;
};

const statusesAwaitingBudgetApproval: ServiceOrderStatus[] = [
  ServiceOrderStatus.AWAITING_APPROVAL,
  ServiceOrderStatus.BUDGET_CHANGED_AWAITING_APPROVAL,
];

class RejectBudgetService {
  async execute({ budgetId, userId, observation }: RejectBudgetData) {
    const budgetRepository = new BudgetRepository();
    const serviceOrderRepository = new ServiceOrderRepository();

    const budget = await budgetRepository.findById(budgetId);

    if (!budget) {
      throw new AppError("Budget not found", 404);
    }

    const serviceOrder = await serviceOrderRepository.findById(
      budget.serviceOrderId
    );

    if (!serviceOrder) {
      throw new AppError("Service order not found", 404);
    }

    const latestBudget =
      await budgetRepository.findLastVersionByServiceOrderId(
        serviceOrder.id
      );

    if (!latestBudget || latestBudget.id !== budget.id) {
      throw new AppError(
        "Only the latest budget version can be rejected",
        409
      );
    }

    if (!statusesAwaitingBudgetApproval.includes(serviceOrder.status)) {
      throw new AppError(
        "Service order is not awaiting budget approval",
        400
      );
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

    return serviceOrderRepository.changeStatusWithHistory({
      id: serviceOrder.id,
      previousStatus: serviceOrder.status,
      newStatus: ServiceOrderStatus.BUDGET_REJECTED,
      userId,
      observation,
    });
  }
}

export { RejectBudgetService };
