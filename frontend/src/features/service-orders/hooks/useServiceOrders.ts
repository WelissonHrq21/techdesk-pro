import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveBudget,
  changeServiceOrderStatus,
  consumePart,
  createBudget,
  createBudgetRevision,
  createServiceOrder,
  findServiceOrder,
  findServiceOrders,
  rejectBudget,
  reverseStockMovement,
  updateServiceOrderDiagnosis,
} from "../api/serviceOrdersApi";
import type {
  BudgetDecisionData,
  BudgetFormData,
  BudgetRevisionFormData,
  ChangeServiceOrderStatusData,
  ConsumePartData,
  FindServiceOrdersParams,
  ReverseStockMovementData,
  UpdateDiagnosisData,
} from "../types/serviceOrder";

type QueryClient = ReturnType<typeof useQueryClient>;

function invalidateServiceOrderQueries(queryClient: QueryClient, id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["service-orders"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });

  if (id) {
    void queryClient.invalidateQueries({ queryKey: ["service-order", id] });
  }
}

export function useCreateServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createServiceOrder,
    onSuccess: () => {
      invalidateServiceOrderQueries(queryClient);
    },
  });
}

export function useServiceOrders(params: FindServiceOrdersParams) {
  return useQuery({
    queryKey: ["service-orders", params],
    queryFn: () => findServiceOrders(params),
  });
}

export function useServiceOrder(id?: string) {
  return useQuery({
    queryKey: ["service-order", id],
    queryFn: () => findServiceOrder(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useChangeServiceOrderStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChangeServiceOrderStatusData) =>
      changeServiceOrderStatus(id, data),
    onSuccess: () => {
      invalidateServiceOrderQueries(queryClient, id);
    },
  });
}

export function useUpdateDiagnosis(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDiagnosisData) =>
      updateServiceOrderDiagnosis(id, data),
    onSuccess: () => {
      invalidateServiceOrderQueries(queryClient, id);
    },
  });
}

export function useCreateBudget(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BudgetFormData) => createBudget(id, data),
    onSuccess: () => {
      invalidateServiceOrderQueries(queryClient, id);
    },
  });
}

export function useCreateBudgetRevision(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BudgetRevisionFormData) =>
      createBudgetRevision(id, data),
    onSuccess: () => {
      invalidateServiceOrderQueries(queryClient, id);
    },
  });
}

export function useApproveBudget(serviceOrderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      data,
    }: {
      budgetId: string;
      data: BudgetDecisionData;
    }) => approveBudget(budgetId, data),
    onSuccess: () => {
      invalidateServiceOrderQueries(queryClient, serviceOrderId);
    },
  });
}

export function useRejectBudget(serviceOrderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      data,
    }: {
      budgetId: string;
      data: BudgetDecisionData;
    }) => rejectBudget(budgetId, data),
    onSuccess: () => {
      invalidateServiceOrderQueries(queryClient, serviceOrderId);
    },
  });
}

export function useConsumePart(serviceOrderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<ConsumePartData, "serviceOrderId">) =>
      consumePart({ ...data, serviceOrderId }),
    onSuccess: () => {
      invalidateServiceOrderQueries(queryClient, serviceOrderId);
      void queryClient.invalidateQueries({ queryKey: ["parts"] });
    },
  });
}

export function useReverseStockMovement(serviceOrderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReverseStockMovementData) => reverseStockMovement(data),
    onSuccess: (result) => {
      invalidateServiceOrderQueries(queryClient, serviceOrderId);
      void queryClient.invalidateQueries({ queryKey: ["parts"] });
      void queryClient.invalidateQueries({
        queryKey: ["part", result.part.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["stock-movements", result.part.id],
      });
    },
  });
}
