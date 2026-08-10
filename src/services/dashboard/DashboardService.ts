import { ServiceOrderStatus } from "@prisma/client";
import {
  DashboardRepository,
  lowStockThreshold,
} from "../../repositories/DashboardRepository";

class DashboardService {
  async execute() {
    const dashboardRepository = new DashboardRepository();
    const summary = await dashboardRepository.getSummary();

    const statusCounts = new Map(
      summary.serviceOrdersByStatus.map((item) => [
        item.status,
        item._count.status,
      ])
    );

    return {
      serviceOrders: {
        open: summary.openServiceOrders,
        createdToday: summary.createdToday,
        deliveredToday: summary.deliveredToday,
        received: statusCounts.get(ServiceOrderStatus.RECEIVED) ?? 0,
        inAnalysis:
          statusCounts.get(ServiceOrderStatus.IN_ANALYSIS) ?? 0,
        awaitingApproval:
          statusCounts.get(ServiceOrderStatus.AWAITING_APPROVAL) ?? 0,
        budgetChangedAwaitingApproval:
          statusCounts.get(
            ServiceOrderStatus.BUDGET_CHANGED_AWAITING_APPROVAL
          ) ?? 0,
        budgetApproved:
          statusCounts.get(ServiceOrderStatus.BUDGET_APPROVED) ?? 0,
        inMaintenance:
          statusCounts.get(ServiceOrderStatus.IN_MAINTENANCE) ?? 0,
        finished: statusCounts.get(ServiceOrderStatus.FINISHED) ?? 0,
        awaitingPickup:
          statusCounts.get(ServiceOrderStatus.AWAITING_PICKUP) ?? 0,
      },
      budgets: {
        awaitingApproval:
          statusCounts.get(ServiceOrderStatus.AWAITING_APPROVAL) ?? 0,
        changedAwaitingApproval:
          statusCounts.get(
            ServiceOrderStatus.BUDGET_CHANGED_AWAITING_APPROVAL
          ) ?? 0,
      },
      stock: {
        outOfStock: summary.partsOutOfStock,
        lowStock: summary.partsLowStock,
        lowStockThreshold,
      },
      recentServiceOrders: summary.recentServiceOrders,
      recentStockMovements: summary.recentStockMovements,
    };
  }
}

export { DashboardService };
