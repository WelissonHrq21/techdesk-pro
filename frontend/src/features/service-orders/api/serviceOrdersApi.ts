import { http } from "../../../api/http";
import type {
  ServiceOrderDetail,
  ServiceOrderFormData,
} from "../types/serviceOrder";

function cleanServiceOrderPayload(data: ServiceOrderFormData) {
  const accessories = data.accessories
    ?.filter((accessory) => accessory.description.trim())
    .map((accessory) => ({
      description: accessory.description.trim(),
      quantity: Number(accessory.quantity),
      observation: accessory.observation?.trim() || undefined,
    }));

  return {
    customerId: data.customerId,
    equipmentId: data.equipmentId,
    reportedIssue: data.reportedIssue.trim(),
    password: data.password?.trim() || undefined,
    accessories: accessories?.length ? accessories : undefined,
  };
}

export async function createServiceOrder(data: ServiceOrderFormData) {
  const response = await http.post<ServiceOrderDetail>(
    "/service-orders",
    cleanServiceOrderPayload(data)
  );

  return response.data;
}

export async function findServiceOrder(id: string) {
  const response = await http.get<ServiceOrderDetail>(`/service-orders/${id}`);

  return response.data;
}
