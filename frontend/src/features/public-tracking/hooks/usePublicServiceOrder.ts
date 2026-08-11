import { useQuery } from "@tanstack/react-query";
import { findPublicServiceOrder } from "../api/publicServiceOrdersApi";

export function usePublicServiceOrder(token?: string) {
  return useQuery({
    queryKey: ["public-service-order", token],
    queryFn: () => findPublicServiceOrder(token ?? ""),
    enabled: Boolean(token),
    retry: false,
  });
}
