import { ServiceOrderStatus, UserRole } from "@prisma/client";

type TransitionKey = `${ServiceOrderStatus}->${ServiceOrderStatus}`;

function transitionKey(
  from: ServiceOrderStatus,
  to: ServiceOrderStatus
): TransitionKey {
  return `${from}->${to}`;
}

const transitionPermissions: Partial<Record<TransitionKey, UserRole[]>> = {
  [transitionKey(
    ServiceOrderStatus.RECEIVED,
    ServiceOrderStatus.IN_ANALYSIS
  )]: [UserRole.ADMIN, UserRole.TECHNICIAN],

  [transitionKey(
    ServiceOrderStatus.IN_ANALYSIS,
    ServiceOrderStatus.AWAITING_APPROVAL
  )]: [UserRole.ADMIN, UserRole.TECHNICIAN],

  [transitionKey(
    ServiceOrderStatus.BUDGET_APPROVED,
    ServiceOrderStatus.IN_MAINTENANCE
  )]: [UserRole.ADMIN, UserRole.TECHNICIAN],

  [transitionKey(
    ServiceOrderStatus.IN_MAINTENANCE,
    ServiceOrderStatus.FINISHED
  )]: [UserRole.ADMIN, UserRole.TECHNICIAN],

  [transitionKey(
    ServiceOrderStatus.FINISHED,
    ServiceOrderStatus.AWAITING_PICKUP
  )]: [UserRole.ADMIN, UserRole.RECEPTION, UserRole.TECHNICIAN],

  [transitionKey(
    ServiceOrderStatus.AWAITING_PICKUP,
    ServiceOrderStatus.DELIVERED
  )]: [UserRole.ADMIN, UserRole.RECEPTION],

  [transitionKey(
    ServiceOrderStatus.RECEIVED,
    ServiceOrderStatus.CANCELLED
  )]: [UserRole.ADMIN],

  [transitionKey(
    ServiceOrderStatus.IN_ANALYSIS,
    ServiceOrderStatus.CANCELLED
  )]: [UserRole.ADMIN],

  [transitionKey(
    ServiceOrderStatus.AWAITING_APPROVAL,
    ServiceOrderStatus.CANCELLED
  )]: [UserRole.ADMIN],

  [transitionKey(
    ServiceOrderStatus.BUDGET_CHANGED_AWAITING_APPROVAL,
    ServiceOrderStatus.CANCELLED
  )]: [UserRole.ADMIN],

  [transitionKey(
    ServiceOrderStatus.BUDGET_REJECTED,
    ServiceOrderStatus.IN_ANALYSIS
  )]: [UserRole.ADMIN, UserRole.TECHNICIAN],

  [transitionKey(
    ServiceOrderStatus.BUDGET_REJECTED,
    ServiceOrderStatus.CANCELLED
  )]: [UserRole.ADMIN],
};

export function canRoleChangeServiceOrderStatus(
  role: UserRole,
  from: ServiceOrderStatus,
  to: ServiceOrderStatus
) {
  const roles = transitionPermissions[transitionKey(from, to)];

  return Boolean(roles?.includes(role));
}
