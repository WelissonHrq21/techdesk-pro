import { http } from "../../../api/http";
import type { PaginatedResponse } from "../../../types/pagination";
import type { Equipment, EquipmentFormData } from "../types/equipment";

type FindEquipmentsParams = {
  page: number;
  limit: number;
  search?: string;
  customerId?: string;
};

function cleanEquipmentPayload(data: EquipmentFormData) {
  return {
    type: data.type.trim(),
    brand: data.brand.trim(),
    model: data.model.trim(),
    serialNumber: data.serialNumber?.trim() || undefined,
    customerId: data.customerId,
  };
}

export async function findEquipments(params: FindEquipmentsParams) {
  const response = await http.get<PaginatedResponse<Equipment>>(
    "/equipments",
    { params }
  );

  return response.data;
}

export async function findEquipment(id: string) {
  const response = await http.get<Equipment>(`/equipments/${id}`);

  return response.data;
}

export async function createEquipment(data: EquipmentFormData) {
  const response = await http.post<Equipment>(
    "/equipments",
    cleanEquipmentPayload(data)
  );

  return response.data;
}

export async function updateEquipment(id: string, data: EquipmentFormData) {
  const response = await http.put<{ message: string }>(
    `/equipments/${id}`,
    cleanEquipmentPayload(data)
  );

  return response.data;
}

export async function deactivateEquipment(id: string) {
  const response = await http.delete<Equipment>(`/equipments/${id}`);

  return response.data;
}
