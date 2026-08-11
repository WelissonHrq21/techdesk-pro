import type { UserRole } from "../types/auth";
import type { ServiceOrderStatus, StockMovementType } from "../types/dashboard";

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador",
  RECEPTION: "Recepcao",
  TECHNICIAN: "Tecnico",
};

export const serviceOrderStatusLabels: Record<ServiceOrderStatus, string> = {
  RECEIVED: "Recebido",
  IN_ANALYSIS: "Em analise",
  AWAITING_APPROVAL: "Aguardando aprovacao",
  BUDGET_CHANGED_AWAITING_APPROVAL:
    "Orcamento alterado - aguardando aprovacao",
  BUDGET_APPROVED: "Orcamento aprovado",
  BUDGET_REJECTED: "Orcamento rejeitado",
  IN_MAINTENANCE: "Em manutencao",
  FINISHED: "Finalizado",
  AWAITING_PICKUP: "Aguardando retirada",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export const stockMovementTypeLabels: Record<StockMovementType, string> = {
  ENTRY: "Entrada",
  EXIT: "Saida",
  ADJUSTMENT: "Ajuste",
};
