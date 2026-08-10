import { ServiceOrderStatus } from "@prisma/client";

export const serviceOrderTransitions: Record<
  ServiceOrderStatus,
  ServiceOrderStatus[]
> = {
  RECEIVED: [
    ServiceOrderStatus.IN_ANALYSIS,
    ServiceOrderStatus.CANCELLED,
  ],

  IN_ANALYSIS: [
    ServiceOrderStatus.AWAITING_APPROVAL,
    ServiceOrderStatus.CANCELLED,
  ],

  AWAITING_APPROVAL: [
    ServiceOrderStatus.CANCELLED,
  ],

  BUDGET_CHANGED_AWAITING_APPROVAL: [
    ServiceOrderStatus.CANCELLED,
  ],

  BUDGET_APPROVED: [
    ServiceOrderStatus.IN_MAINTENANCE,
  ],

  BUDGET_REJECTED: [
    ServiceOrderStatus.IN_ANALYSIS,
    ServiceOrderStatus.CANCELLED,
  ],

  IN_MAINTENANCE: [
    ServiceOrderStatus.FINISHED,
  ],

  FINISHED: [
    ServiceOrderStatus.AWAITING_PICKUP,
  ],

  AWAITING_PICKUP: [
    ServiceOrderStatus.DELIVERED,
  ],

  DELIVERED: [],
  CANCELLED: [],
};
