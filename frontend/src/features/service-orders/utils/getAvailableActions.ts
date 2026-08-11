import type { UserRole } from "../../../types/auth";
import type { ServiceOrderStatus } from "../../../types/dashboard";

export type ServiceOrderAction =
  | "START_ANALYSIS"
  | "EDIT_DIAGNOSIS"
  | "CREATE_BUDGET"
  | "SEND_FOR_APPROVAL"
  | "APPROVE_BUDGET"
  | "REJECT_BUDGET"
  | "RETURN_TO_ANALYSIS"
  | "START_MAINTENANCE"
  | "CONSUME_PART"
  | "REVISE_BUDGET"
  | "FINISH"
  | "MARK_AWAITING_PICKUP"
  | "DELIVER";

type GetAvailableActionsParams = {
  status: ServiceOrderStatus;
  role: UserRole;
  hasBudget: boolean;
};

function isAdminOrTechnician(role: UserRole) {
  return role === "ADMIN" || role === "TECHNICIAN";
}

function isAdminOrReception(role: UserRole) {
  return role === "ADMIN" || role === "RECEPTION";
}

export function getAvailableActions({
  status,
  role,
  hasBudget,
}: GetAvailableActionsParams): ServiceOrderAction[] {
  const actions: ServiceOrderAction[] = [];

  if (status === "RECEIVED" && isAdminOrTechnician(role)) {
    actions.push("START_ANALYSIS");
  }

  if (status === "IN_ANALYSIS" && isAdminOrTechnician(role)) {
    actions.push("EDIT_DIAGNOSIS", "CREATE_BUDGET");

    if (hasBudget) {
      actions.push("SEND_FOR_APPROVAL");
    }
  }

  if (
    (status === "AWAITING_APPROVAL" ||
      status === "BUDGET_CHANGED_AWAITING_APPROVAL") &&
    isAdminOrReception(role)
  ) {
    actions.push("APPROVE_BUDGET", "REJECT_BUDGET");
  }

  if (status === "BUDGET_REJECTED" && isAdminOrTechnician(role)) {
    actions.push("RETURN_TO_ANALYSIS");
  }

  if (status === "BUDGET_APPROVED" && isAdminOrTechnician(role)) {
    actions.push("START_MAINTENANCE");
  }

  if (status === "IN_MAINTENANCE" && isAdminOrTechnician(role)) {
    actions.push("CONSUME_PART", "REVISE_BUDGET", "FINISH");
  }

  if (
    status === "FINISHED" &&
    (role === "ADMIN" || role === "RECEPTION" || role === "TECHNICIAN")
  ) {
    actions.push("MARK_AWAITING_PICKUP");
  }

  if (status === "AWAITING_PICKUP" && isAdminOrReception(role)) {
    actions.push("DELIVER");
  }

  return actions;
}
