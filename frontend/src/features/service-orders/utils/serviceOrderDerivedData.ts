import type {
  BudgetSummary,
  ServiceOrderDetail,
} from "../types/serviceOrder";

export function getCurrentBudget(serviceOrder: Pick<ServiceOrderDetail, "budgets">) {
  return serviceOrder.budgets.reduce<BudgetSummary | null>((current, budget) => {
    if (!current || budget.version > current.version) {
      return budget;
    }

    return current;
  }, null);
}

export function getConsumedByPartId(
  serviceOrder: Pick<ServiceOrderDetail, "stockMovements">
) {
  return serviceOrder.stockMovements.reduce<Record<string, number>>(
    (accumulator, movement) => {
      if (movement.type !== "EXIT") {
        return accumulator;
      }

      accumulator[movement.part.id] =
        (accumulator[movement.part.id] ?? 0) + movement.quantity;

      return accumulator;
    },
    {}
  );
}
