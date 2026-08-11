import { useQuery } from "@tanstack/react-query";
import { findParts } from "../api/partsApi";

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
