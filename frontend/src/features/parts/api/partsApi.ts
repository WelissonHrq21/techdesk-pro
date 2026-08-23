import { http } from "../../../api/http";
import type { PaginatedResponse } from "../../../types/pagination";
import type {
  Part,
  PartFormData,
  StockEntryData,
  StockExitData,
  StockMovement,
  StockMovementFilters,
  StockStatus,
} from "../types/part";

type FindPartsParams = {
  page?: number;
  limit?: number;
  search?: string;
  maxStock?: number;
  stockStatus?: StockStatus;
};

export async function findParts(params: FindPartsParams) {
  const response = await http.get<PaginatedResponse<Part>>("/parts", {
    params,
  });

  return response.data;
}

export async function findPart(id: string) {
  const response = await http.get<Part>(`/parts/${id}`);

  return response.data;
}

function cleanPartPayload(data: PartFormData) {
  return {
    name: data.name.trim(),
    brand: data.brand.trim(),
    currentPrice: Number(data.currentPrice),
    minimumStock: Number(data.minimumStock),
    supplier: data.supplier?.trim() || undefined,
  };
}

export async function createPart(data: PartFormData) {
  const response = await http.post<Part>("/parts", cleanPartPayload(data));

  return response.data;
}

export async function updatePart(id: string, data: PartFormData) {
  const response = await http.put<Part>(`/parts/${id}`, cleanPartPayload(data));

  return response.data;
}

export async function deactivatePart(id: string) {
  const response = await http.delete<Part>(`/parts/${id}`);

  return response.data;
}

export async function createStockEntry(id: string, data: StockEntryData) {
  const response = await http.post(`/parts/${id}/stock/entry`, {
    quantity: Number(data.quantity),
    reason: data.reason?.trim() || undefined,
  });

  return response.data;
}

export async function createStockExit(id: string, data: StockExitData) {
  const response = await http.post(`/parts/${id}/stock/exit`, {
    quantity: Number(data.quantity),
    reason: data.reason?.trim() || undefined,
    serviceOrderId: data.serviceOrderId || undefined,
  });

  return response.data;
}

export async function findPartStockMovements(
  id: string,
  params: StockMovementFilters
) {
  const response = await http.get<PaginatedResponse<StockMovement>>(
    `/parts/${id}/stock-movements`,
    { params }
  );

  return response.data;
}
