import { http } from "../../../api/http";
import type { PaginatedResponse } from "../../../types/pagination";
import type { Part } from "../types/part";

type FindPartsParams = {
  page?: number;
  limit?: number;
  search?: string;
  maxStock?: number;
};

export async function findParts(params: FindPartsParams) {
  const response = await http.get<PaginatedResponse<Part>>("/parts", {
    params,
  });

  return response.data;
}
