import type {
  BudgetSummary,
  ServiceOrderDetail,
  ServiceOrderStockMovement,
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

export type ConsumptionSummary = {
  movement: ServiceOrderStockMovement;
  reversals: ServiceOrderStockMovement[];
  consumedQuantity: number;
  reversedQuantity: number;
  netQuantity: number;
  reversibleQuantity: number;
};

export function getConsumptionSummaries(
  serviceOrder: Pick<ServiceOrderDetail, "stockMovements">
) {
  const reversalsByOriginalId = serviceOrder.stockMovements.reduce<
    Record<string, ServiceOrderStockMovement[]>
  >((accumulator, movement) => {
    if (movement.type !== "REVERSAL" || !movement.reversalOfMovementId) {
      return accumulator;
    }

    accumulator[movement.reversalOfMovementId] = [
      ...(accumulator[movement.reversalOfMovementId] ?? []),
      movement,
    ];

    return accumulator;
  }, {});

  return serviceOrder.stockMovements
    .filter((movement) => movement.type === "EXIT" && movement.serviceOrderId)
    .map<ConsumptionSummary>((movement) => {
      const reversals = reversalsByOriginalId[movement.id] ?? [];
      const reversedQuantity = reversals.reduce((total, reversal) => {
        return total + reversal.quantity;
      }, 0);
      const netQuantity = Math.max(movement.quantity - reversedQuantity, 0);

      return {
        movement,
        reversals,
        consumedQuantity: movement.quantity,
        reversedQuantity,
        netQuantity,
        reversibleQuantity: netQuantity,
      };
    });
}
