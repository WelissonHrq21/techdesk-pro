import { http } from "../../../api/http";
import type { PublicServiceOrder } from "../types/publicServiceOrder";

export async function findPublicServiceOrder(token: string) {
  const response = await http.get<PublicServiceOrder>(
    `/public/service-orders/${token}`
  );

  return response.data;
}
