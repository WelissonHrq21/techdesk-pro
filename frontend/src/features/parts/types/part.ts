export type StockStatus = "OK" | "LOW_STOCK" | "OUT_OF_STOCK";

export type Part = {
  id: string;
  name: string;
  brand: string;
  currentPrice: string;
  stock: number;
  minimumStock: number;
  stockStatus: StockStatus;
  supplier: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PartFormData = {
  name: string;
  brand: string;
  currentPrice: number;
  minimumStock: number;
  supplier?: string;
};

export type StockMovement = {
  id: string;
  type: "ENTRY" | "EXIT" | "ADJUSTMENT" | "REVERSAL";
  quantity: number;
  reason: string | null;
  createdAt: string;
  reversalOfMovementId: string | null;
  user: {
    id: string;
    name: string;
    login: string;
    role: string;
  } | null;
  serviceOrder: {
    id: string;
    number: number;
  } | null;
};

export type StockEntryData = {
  quantity: number;
  reason?: string;
};

export type StockExitData = StockEntryData & {
  serviceOrderId?: string;
};

export type StockMovementType = StockMovement["type"];

export type StockMovementFilters = {
  page: number;
  limit: number;
  type?: StockMovementType;
  dateFrom?: string;
  dateTo?: string;
};
