import { http } from "../api/http";
import type { DashboardSummary } from "../types/dashboard";

export async function getDashboardSummary() {
  const response = await http.get<DashboardSummary>("/dashboard/summary");

  return response.data;
}
