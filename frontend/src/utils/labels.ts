import type { UserRole } from "../types/auth";
import type { ServiceOrderStatus, StockMovementType } from "../types/dashboard";

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador",
  RECEPTION: "Recepção",
  TECHNICIAN: "Técnico",
};

export const serviceOrderStatusLabels: Record<ServiceOrderStatus, string> = {
  RECEIVED: "Recebido",
  IN_ANALYSIS: "Em análise",
  AWAITING_APPROVAL: "Aguardando aprovação",
  BUDGET_CHANGED_AWAITING_APPROVAL:
    "Orçamento alterado - aguardando aprovação",
  BUDGET_APPROVED: "Orçamento aprovado",
  BUDGET_REJECTED: "Orçamento rejeitado",
  IN_MAINTENANCE: "Em manutenção",
  FINISHED: "Finalizado",
  AWAITING_PICKUP: "Aguardando retirada",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export const stockMovementTypeLabels: Record<StockMovementType, string> = {
  ENTRY: "Entrada",
  EXIT: "Saída",
  ADJUSTMENT: "Ajuste",
};
