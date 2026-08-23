import { http } from "../../../api/http";
import type { PaginatedResponse } from "../../../types/pagination";
import type {
  BudgetDecisionData,
  BudgetFormData,
  BudgetItemFormData,
  BudgetRevisionRequestData,
  ChangeServiceOrderStatusData,
  ConsumePartData,
  FindServiceOrdersParams,
  ReverseStockMovementData,
  ReverseStockMovementResponse,
  ServiceOrderDetail,
  ServiceOrderFormData,
  ServiceOrderListItem,
  UpdateDiagnosisData,
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

export async function findServiceOrders(params: FindServiceOrdersParams) {
  const response = await http.get<PaginatedResponse<ServiceOrderListItem>>(
    "/service-orders",
    {
      params: {
        ...params,
        status: params.status?.join(","),
      },
    }
  );

  return response.data;
}

export async function findServiceOrder(id: string) {
  const response = await http.get<ServiceOrderDetail>(`/service-orders/${id}`);

  return response.data;
}

export async function changeServiceOrderStatus(
  id: string,
  data: ChangeServiceOrderStatusData
) {
  const response = await http.patch<ServiceOrderDetail>(
    `/service-orders/${id}/status`,
    {
      status: data.status,
      observation: data.observation?.trim() || undefined,
    }
  );

  return response.data;
}

export async function updateServiceOrderDiagnosis(
  id: string,
  data: UpdateDiagnosisData
) {
  const response = await http.patch<ServiceOrderDetail>(
    `/service-orders/${id}/diagnosis`,
    {
      diagnosis: data.diagnosis.trim(),
    }
  );

  return response.data;
}

export async function createBudget(id: string, data: BudgetFormData) {
  const response = await http.post(`/service-orders/${id}/budgets`, {
    items: cleanBudgetItems(data.items),
  });

  return response.data;
}

export async function createBudgetRevision(
  id: string,
  data: BudgetRevisionRequestData
) {
  const response = await http.post(`/service-orders/${id}/budgets/revision`, {
    items: cleanBudgetItems(data.items),
    observation: data.observation?.trim() || undefined,
  });

  return response.data;
}

export async function approveBudget(id: string, data: BudgetDecisionData) {
  const response = await http.post(`/budgets/${id}/approve`, {
    observation: data.observation?.trim() || undefined,
  });

  return response.data;
}

export async function rejectBudget(id: string, data: BudgetDecisionData) {
  const response = await http.post(`/budgets/${id}/reject`, {
    observation: data.observation?.trim() || undefined,
  });

  return response.data;
}

export async function consumePart(data: ConsumePartData) {
  const response = await http.post(
    `/service-orders/${data.serviceOrderId}/parts/${data.partId}/consume`,
    {
      quantity: data.quantity,
      observation: data.observation?.trim() || undefined,
    }
  );

  return response.data;
}

function cleanBudgetItems(items: BudgetItemFormData[]) {
  return items.map((item) => {
    if (item.type === "PART") {
      return {
        type: "PART" as const,
        partId: item.partId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      };
    }

    return {
      type: "SERVICE" as const,
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    };
  });
}

export async function reverseStockMovement(data: ReverseStockMovementData) {
  const response = await http.post<ReverseStockMovementResponse>(
    `/stock-movements/${data.movementId}/reverse`,
    {
      quantity: data.quantity,
      reason: data.reason.trim(),
    }
  );

  return response.data;
}
