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

export type StockMovementType = "ENTRY" | "EXIT" | "ADJUSTMENT";

export type DashboardSummary = {
  serviceOrdersByStatus: Array<{
    status: ServiceOrderStatus;
    _count: {
      status: number;
    };
  }>;
  openServiceOrders: number;
  createdToday: number;
  deliveredToday: number;
  partsOutOfStock: number;
  partsLowStock: number;
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
