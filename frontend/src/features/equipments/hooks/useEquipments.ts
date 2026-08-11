import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEquipment,
  deactivateEquipment,
  findEquipment,
  findEquipments,
  updateEquipment,
} from "../api/equipmentsApi";
import type { EquipmentFormData } from "../types/equipment";

export function useEquipments(
  page: number,
  limit: number,
  search: string,
  customerId?: string
) {
  return useQuery({
    queryKey: ["equipments", { page, limit, search, customerId }],
    queryFn: () =>
      findEquipments({
        page,
        limit,
        search: search || undefined,
        customerId,
      }),
  });
}

export function useEquipment(id?: string) {
  return useQuery({
    queryKey: ["equipments", id],
    queryFn: () => findEquipment(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEquipment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["equipments"] });
    },
  });
}

export function useUpdateEquipment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EquipmentFormData) => updateEquipment(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["equipments"] });
      void queryClient.invalidateQueries({ queryKey: ["equipments", id] });
    },
  });
}

export function useDeactivateEquipment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deactivateEquipment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["equipments"] });
      void queryClient.invalidateQueries({ queryKey: ["equipments", id] });
    },
  });
}
