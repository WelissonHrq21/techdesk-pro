import { ServiceOrderStatus, UserRole } from "@prisma/client";
import { canRoleChangeServiceOrderStatus } from "../../config/serviceOrderTransitionPermissions";
import { serviceOrderTransitions } from "../../constants/serviceOrderTransitions";
import { AppError } from "../../errors/AppError";
import { BudgetRepository } from "../../repositories/BudgetRepository";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";
import { UserRepository } from "../../repositories/UserRepository";

type ChangeServiceOrderStatusData = {
  id: string;
  status: ServiceOrderStatus;
  userRole: UserRole;
  userId?: string;
  observation?: string;
};

class ChangeServiceOrderStatusService {
  async execute({
    id,
    status,
    userRole,
    userId,
    observation,
  }: ChangeServiceOrderStatusData) {
    const serviceOrderRepository = new ServiceOrderRepository();
    const budgetRepository = new BudgetRepository();

    const serviceOrder = await serviceOrderRepository.findById(id);

    if (!serviceOrder) {
      throw new AppError("Service order not found", 404);
    }

    if (serviceOrder.status === ServiceOrderStatus.DELIVERED) {
      throw new AppError(
        "Delivered service orders cannot be modified",
        400
      );
    }

    if (serviceOrder.status === ServiceOrderStatus.CANCELLED) {
      throw new AppError(
        "Cancelled service orders cannot be modified",
        400
      );
    }

    const allowedStatuses =
      serviceOrderTransitions[serviceOrder.status];

    const transitionIsAllowed = allowedStatuses.includes(status);

    if (!transitionIsAllowed) {
      throw new AppError(
        `Invalid status transition from ${serviceOrder.status} to ${status}`,
        400
      );
    }

    const roleCanChangeStatus = canRoleChangeServiceOrderStatus(
      userRole,
      serviceOrder.status,
      status
    );

    if (!roleCanChangeStatus) {
      throw new AppError("Forbidden", 403);
    }

    if (status === ServiceOrderStatus.AWAITING_APPROVAL) {
      const lastBudget =
        await budgetRepository.findLastVersionByServiceOrderId(id);

      if (!lastBudget) {
        throw new AppError(
          "Service order must have a budget before awaiting approval",
          400
        );
      }
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
      id,
      previousStatus: serviceOrder.status,
      newStatus: status,
      userId,
      observation,
    });
  }
}

export { ChangeServiceOrderStatusService };
