import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  PackageX,
  RefreshCcw,
  Timer,
  Truck,
  Wrench,
} from "lucide-react";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useDashboard } from "../hooks/useDashboard";
import { formatDateTime } from "../utils/formatters";
import {
  serviceOrderStatusLabels,
  stockMovementTypeLabels,
} from "../utils/labels";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-md border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="h-96 animate-pulse rounded-md border border-slate-200 bg-white" />
        <div className="h-96 animate-pulse rounded-md border border-slate-200 bg-white" />
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  icon: typeof ClipboardList;
  tone: "slate" | "sky" | "amber" | "indigo" | "emerald" | "rose";
};

const statToneStyles: Record<StatCardProps["tone"], string> = {
  slate: "bg-slate-100 text-slate-700",
  sky: "bg-sky-50 text-sky-700",
  amber: "bg-amber-50 text-amber-700",
  indigo: "bg-indigo-50 text-indigo-700",
  emerald: "bg-emerald-50 text-emerald-700",
  rose: "bg-rose-50 text-rose-700",
};

function StatCard({ label, value, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-md ${statToneStyles[tone]}`}
        >
          <Icon size={18} />
        </span>
      </div>
      <strong className="mt-4 block text-3xl font-semibold text-slate-950">
        {value}
      </strong>
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading, isError, refetch, isFetching } = useDashboard();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto text-amber-500" size={34} />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">
            Não foi possível carregar o dashboard.
          </h2>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300"
          >
            <RefreshCcw size={16} />
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  const stats = [
    {
      label: "OS abertas",
      value: data.serviceOrders.open,
      icon: ClipboardList,
      tone: "slate" as const,
    },
    {
      label: serviceOrderStatusLabels.RECEIVED,
      value: data.serviceOrders.received,
      icon: ClipboardCheck,
      tone: "sky" as const,
    },
    {
      label: serviceOrderStatusLabels.IN_ANALYSIS,
      value: data.serviceOrders.inAnalysis,
      icon: Timer,
      tone: "sky" as const,
    },
    {
      label: serviceOrderStatusLabels.AWAITING_APPROVAL,
      value: data.serviceOrders.awaitingApproval,
      icon: AlertTriangle,
      tone: "amber" as const,
    },
    {
      label: serviceOrderStatusLabels.IN_MAINTENANCE,
      value: data.serviceOrders.inMaintenance,
      icon: Wrench,
      tone: "indigo" as const,
    },
    {
      label: serviceOrderStatusLabels.AWAITING_PICKUP,
      value: data.serviceOrders.awaitingPickup,
      icon: Truck,
      tone: "emerald" as const,
    },
    {
      label: "Entregues hoje",
      value: data.serviceOrders.deliveredToday,
      icon: ClipboardCheck,
      tone: "emerald" as const,
    },
    {
      label: "Sem estoque",
      value: data.stock.outOfStock,
      icon: PackageX,
      tone: "rose" as const,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">
              OS recentes
            </h2>
          </div>

          {data.recentServiceOrders.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Nenhuma ordem de serviço recente.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentServiceOrders.map((serviceOrder) => (
                <div
                  key={serviceOrder.id}
                  className="grid gap-3 px-5 py-4 md:grid-cols-[80px_1fr_auto]"
                >
                  <strong className="text-sm font-semibold text-slate-950">
                    #{serviceOrder.number}
                  </strong>

                  <div>
                    <p className="text-sm font-medium text-slate-950">
                      {serviceOrder.equipment.brand}{" "}
                      {serviceOrder.equipment.model}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {serviceOrder.customer.name} -{" "}
                      {formatDateTime(serviceOrder.createdAt)}
                    </p>
                  </div>

                  <div className="md:text-right">
                    <StatusBadge
                      type="service-order"
                      value={serviceOrder.status}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Estoque</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-rose-50 p-4">
                <span className="text-sm text-rose-700">Sem estoque</span>
                <strong className="mt-2 block text-2xl font-semibold text-rose-900">
                  {data.stock.outOfStock}
                </strong>
              </div>
              <div className="rounded-md bg-amber-50 p-4">
                <span className="text-sm text-amber-700">Estoque baixo</span>
                <strong className="mt-2 block text-2xl font-semibold text-amber-900">
                  {data.stock.lowStock}
                </strong>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">
                Movimentações recentes
              </h2>
            </div>

            {data.recentStockMovements.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">
                Nenhuma movimentacao recente.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentStockMovements.map((movement) => (
                  <div key={movement.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-950">
                          {movement.part.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {stockMovementTypeLabels[movement.type]} de{" "}
                          {movement.quantity} -{" "}
                          {formatDateTime(movement.createdAt)}
                        </p>
                        {movement.serviceOrder && (
                          <p className="mt-1 text-xs text-slate-500">
                            OS #{movement.serviceOrder.number}
                          </p>
                        )}
                      </div>

                      <StatusBadge
                        type="stock-movement"
                        value={movement.type}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
