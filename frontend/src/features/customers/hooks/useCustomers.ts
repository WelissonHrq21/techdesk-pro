import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomer,
  deactivateCustomer,
  findCustomer,
  findCustomers,
  updateCustomer,
} from "../api/customersApi";
import type { CustomerFormData } from "../types/customer";

export function useCustomers(page: number, limit: number, search: string) {
  return useQuery({
    queryKey: ["customers", { page, limit, search }],
    queryFn: () => findCustomers({ page, limit, search: search || undefined }),
  });
}

export function useCustomer(id?: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => findCustomer(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CustomerFormData) => updateCustomer(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      void queryClient.invalidateQueries({ queryKey: ["customers", id] });
    },
  });
}

export function useDeactivateCustomer(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deactivateCustomer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      void queryClient.invalidateQueries({ queryKey: ["customers", id] });
    },
  });
}
