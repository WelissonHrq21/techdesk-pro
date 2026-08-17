import type {
  ServiceOrderStatus,
  StockMovementType,
} from "../../../types/dashboard";
import type { Customer } from "../../customers/types/customer";
import type { Equipment } from "../../equipments/types/equipment";

export type Accessory = {
  id?: string;
  description: string;
  quantity: number;
  observation?: string | null;
};

export type ServiceOrderFormData = {
  customerId: string;
  equipmentId: string;
  reportedIssue: string;
  password?: string;
  accessories?: Accessory[];
};

export type BudgetSummary = {
  id: string;
  version: number;
  totalValue: string;
  createdAt: string;
  updatedAt: string;
  serviceOrderId: string;
  budgetItems: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    part: {
      id: string;
      name: string;
      brand?: string;
      currentPrice?: string;
      stock?: number;
    };
  }>;
};

export type ServiceOrderHistory = {
  id: string;
  previousStatus: ServiceOrderStatus;
  newStatus: ServiceOrderStatus;
  observation: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    login: string;
    role: string;
  } | null;
};

export type ServiceOrderStockMovement = {
  id: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  createdAt: string;
  partId: string;
  serviceOrderId: string | null;
  userId: string | null;
  reversalOfMovementId: string | null;
  part: {
    id: string;
    name: string;
    stock?: number;
  };
  user: {
    id: string;
    name: string;
  } | null;
};

export type ServiceOrderListItem = {
  id: string;
  number: number;
  publicToken?: string;
  status: ServiceOrderStatus;
  reportedIssue: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  equipment: {
    id: string;
    type: string;
    brand: string;
    model: string;
    serialNumber: string | null;
  };
};

export type FindServiceOrdersParams = {
  page: number;
  limit: number;
  status?: ServiceOrderStatus[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "updatedAt" | "number";
  sortOrder?: "asc" | "desc";
};

export type BudgetItemFormData = {
  partId: string;
  quantity: number;
  unitPrice: number;
};

export type BudgetFormData = {
  items: BudgetItemFormData[];
};

export type BudgetRevisionFormData = BudgetFormData & {
  observation?: string;
};

export type ChangeServiceOrderStatusData = {
  status: ServiceOrderStatus;
  observation?: string;
};

export type UpdateDiagnosisData = {
  diagnosis: string;
};

export type BudgetDecisionData = {
  observation?: string;
};

export type ConsumePartData = {
  serviceOrderId: string;
  partId: string;
  quantity: number;
  observation?: string;
};

export type ReverseStockMovementData = {
  movementId: string;
  quantity: number;
  reason: string;
};

export type ReverseStockMovementResponse = {
  part: {
    id: string;
    name: string;
    brand: string;
    currentPrice: string;
    stock: number;
    supplier: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  };
  movement: ServiceOrderStockMovement & {
    reversalOfMovement: Pick<
      ServiceOrderStockMovement,
      | "id"
      | "type"
      | "quantity"
      | "partId"
      | "serviceOrderId"
      | "userId"
      | "createdAt"
    >;
  };
  originalMovement: ServiceOrderStockMovement;
  reversedQuantity: number;
  reversibleQuantity: number;
};

export type ServiceOrderDetail = {
  id: string;
  number: number;
  publicToken: string;
  reportedIssue: string;
  diagnosis: string | null;
  password: string | null;
  status: ServiceOrderStatus;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  equipment: Equipment;
  accessories: Accessory[];
  budgets: BudgetSummary[];
  serviceOrderHistories: ServiceOrderHistory[];
  stockMovements: ServiceOrderStockMovement[];
};
