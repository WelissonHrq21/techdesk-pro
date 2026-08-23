import type { StockStatus } from "../types/part";

const statusConfig: Record<
  StockStatus,
  { label: string; className: string }
> = {
  OK: {
    label: "OK",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  LOW_STOCK: {
    label: "Baixo estoque",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  OUT_OF_STOCK: {
    label: "Sem estoque",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}
