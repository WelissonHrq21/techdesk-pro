import { BudgetItemType } from "@prisma/client";

export type BudgetItemInput = {
  type?: BudgetItemType;
  partId?: string | null;
  description?: string;
  quantity: number;
  unitPrice: number;
};

export type PreparedBudgetItem = {
  type: BudgetItemType;
  partId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
};
