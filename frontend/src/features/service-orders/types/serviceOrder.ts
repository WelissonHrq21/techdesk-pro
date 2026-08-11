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
  budgetItems: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    part: {
      id: string;
      name: string;
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
  createdAt: string;
  part: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
  } | null;
};

export type ServiceOrderDetail = {
  id: string;
  number: number;
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
