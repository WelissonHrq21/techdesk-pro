import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createServiceOrder,
  findServiceOrder,
} from "../api/serviceOrdersApi";

export function useCreateServiceOrder() {
  return useMutation({
    mutationFn: createServiceOrder,
  });
}

export function useServiceOrder(id?: string) {
  return useQuery({
    queryKey: ["service-orders", id],
    queryFn: () => findServiceOrder(id ?? ""),
    enabled: Boolean(id),
  });
}
