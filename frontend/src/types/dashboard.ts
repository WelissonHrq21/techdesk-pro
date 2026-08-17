export type ServiceOrderStatus =
  | "RECEIVED"
  | "IN_ANALYSIS"
  | "AWAITING_APPROVAL"
  | "BUDGET_CHANGED_AWAITING_APPROVAL"
  | "BUDGET_APPROVED"
  | "BUDGET_REJECTED"
  | "IN_MAINTENANCE"
  | "FINISHED"
  | "AWAITING_PICKUP"
  | "DELIVERED"
  | "CANCELLED";

export type StockMovementType = "ENTRY" | "EXIT" | "ADJUSTMENT" | "REVERSAL";

export type DashboardSummary = {
  serviceOrders: {
    open: number;
    createdToday: number;
    deliveredToday: number;
    received: number;
    inAnalysis: number;
    awaitingApproval: number;
    budgetChangedAwaitingApproval: number;
    budgetApproved: number;
    inMaintenance: number;
    finished: number;
    awaitingPickup: number;
  };
  budgets: {
    awaitingApproval: number;
    changedAwaitingApproval: number;
  };
  stock: {
    outOfStock: number;
    lowStock: number;
    lowStockThreshold: number;
  };
  recentServiceOrders: Array<{
    id: string;
    number: number;
    status: ServiceOrderStatus;
    createdAt: string;
    customer: {
      id: string;
      name: string;
    };
    equipment: {
      id: string;
      type: string;
      brand: string;
      model: string;
    };
  }>;
  recentStockMovements: Array<{
    id: string;
    type: StockMovementType;
    quantity: number;
    createdAt: string;
    part: {
      id: string;
      name: string;
    };
    user: {
      id: string;
      name: string;
    } | null;
    serviceOrder: {
      id: string;
      number: number;
    } | null;
  }>;
};
