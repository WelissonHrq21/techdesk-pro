import type { ServiceOrderStatus, StockMovementType } from "../../types/dashboard";
import {
  serviceOrderStatusLabels,
  stockMovementTypeLabels,
} from "../../utils/labels";

const serviceOrderStatusStyles: Record<ServiceOrderStatus, string> = {
  RECEIVED: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_ANALYSIS: "bg-sky-50 text-sky-700 ring-sky-200",
  AWAITING_APPROVAL: "bg-amber-50 text-amber-700 ring-amber-200",
  BUDGET_CHANGED_AWAITING_APPROVAL: "bg-orange-50 text-orange-700 ring-orange-200",
  BUDGET_APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  BUDGET_REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  IN_MAINTENANCE: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  FINISHED: "bg-teal-50 text-teal-700 ring-teal-200",
  AWAITING_PICKUP: "bg-purple-50 text-purple-700 ring-purple-200",
  DELIVERED: "bg-green-50 text-green-700 ring-green-200",
  CANCELLED: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

const stockMovementStyles: Record<StockMovementType, string> = {
  ENTRY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  EXIT: "bg-rose-50 text-rose-700 ring-rose-200",
  ADJUSTMENT: "bg-amber-50 text-amber-700 ring-amber-200",
};

type StatusBadgeProps =
  | {
      type: "service-order";
      value: ServiceOrderStatus;
    }
  | {
      type: "stock-movement";
      value: StockMovementType;
    };

export function StatusBadge(props: StatusBadgeProps) {
  const className =
    props.type === "service-order"
      ? serviceOrderStatusStyles[props.value]
      : stockMovementStyles[props.value];
  const label =
    props.type === "service-order"
      ? serviceOrderStatusLabels[props.value]
      : stockMovementTypeLabels[props.value];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}
