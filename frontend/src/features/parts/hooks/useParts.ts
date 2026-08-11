import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPart,
  createStockEntry,
  createStockExit,
  deactivatePart,
  findPart,
  findParts,
  findPartStockMovements,
  updatePart,
} from "../api/partsApi";
import type { PartFormData, StockEntryData, StockExitData } from "../types/part";

type UsePartsParams = {
  page?: number;
  limit?: number;
  search?: string;
  maxStock?: number;
  enabled?: boolean;
};

export function useParts({
  page = 1,
  limit = 10,
  search,
  maxStock,
  enabled = true,
}: UsePartsParams) {
  return useQuery({
    queryKey: ["parts", { page, limit, search, maxStock }],
    queryFn: () => findParts({ page, limit, search, maxStock }),
    enabled,
  });
}

export function usePart(id?: string) {
  return useQuery({
    queryKey: ["part", id],
    queryFn: () => findPart(id ?? ""),
    enabled: Boolean(id),
  });
}

export function usePartStockMovements(id?: string) {
  return useQuery({
    queryKey: ["stock-movements", id],
    queryFn: () => findPartStockMovements(id ?? ""),
    enabled: Boolean(id),
  });
}

function invalidatePartQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  void queryClient.invalidateQueries({ queryKey: ["parts"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });

  if (id) {
    void queryClient.invalidateQueries({ queryKey: ["part", id] });
    void queryClient.invalidateQueries({ queryKey: ["stock-movements", id] });
  }
}

export function useCreatePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPart,
    onSuccess: () => {
      invalidatePartQueries(queryClient);
    },
  });
}

export function useUpdatePart(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PartFormData) => updatePart(id, data),
    onSuccess: () => {
      invalidatePartQueries(queryClient, id);
    },
  });
}

export function useDeactivatePart(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deactivatePart(id),
    onSuccess: () => {
      invalidatePartQueries(queryClient, id);
    },
  });
}

export function useCreateStockEntry(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StockEntryData) => createStockEntry(id, data),
    onSuccess: () => {
      invalidatePartQueries(queryClient, id);
    },
  });
}

export function useCreateStockExit(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StockExitData) => createStockExit(id, data),
    onSuccess: () => {
      invalidatePartQueries(queryClient, id);
      void queryClient.invalidateQueries({ queryKey: ["service-orders"] });
    },
  });
}
