import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Pagination } from "../../../components/ui/Pagination";
import { SearchInput } from "../../../components/ui/SearchInput";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import type { ServiceOrderStatus } from "../../../types/dashboard";
import { formatDateTime } from "../../../utils/formatters";
import { serviceOrderStatusLabels } from "../../../utils/labels";
import { useServiceOrders } from "../hooks/useServiceOrders";

const limit = 20;

type StatusFilter = {
  label: string;
  value?: ServiceOrderStatus[];
};

const statusFilters: StatusFilter[] = [
  { label: "Todas" },
  { label: "Recebidas", value: ["RECEIVED"] },
  { label: "Em analise", value: ["IN_ANALYSIS"] },
  {
    label: "Aguard. aprovacao",
    value: ["AWAITING_APPROVAL", "BUDGET_CHANGED_AWAITING_APPROVAL"],
  },
  { label: "Aprovadas", value: ["BUDGET_APPROVED"] },
  { label: "Em manutencao", value: ["IN_MAINTENANCE"] },
  { label: "Finalizadas", value: ["FINISHED"] },
  { label: "Aguard. retirada", value: ["AWAITING_PICKUP"] },
];

const rolePriorityStatuses: Record<string, ServiceOrderStatus[]> = {
  TECHNICIAN: ["RECEIVED", "IN_ANALYSIS", "BUDGET_APPROVED", "IN_MAINTENANCE"],
  RECEPTION: [
    "AWAITING_APPROVAL",
    "BUDGET_CHANGED_AWAITING_APPROVAL",
    "FINISHED",
    "AWAITING_PICKUP",
  ],
  ADMIN: [],
};

function serializeStatus(status?: ServiceOrderStatus[]) {
  return status?.join(",") ?? "";
}

export function ServiceOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const page = Number(searchParams.get("page") ?? "1");
  const activeStatusParam = searchParams.get("status") ?? "";
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(search);
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const activeStatuses = useMemo<ServiceOrderStatus[] | undefined>(() => {
    if (!activeStatusParam) {
      return undefined;
    }

    return activeStatusParam.split(",") as ServiceOrderStatus[];
  }, [activeStatusParam]);
  const serviceOrdersQuery = useServiceOrders({
    page,
    limit,
    status: activeStatuses,
    search: debouncedSearch || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy: "updatedAt",
    sortOrder: "desc",
  });
  const priorityStatuses = rolePriorityStatuses[user?.role ?? "ADMIN"] ?? [];

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (debouncedSearch) {
      nextParams.set("search", debouncedSearch);
    } else {
      nextParams.delete("search");
    }

    nextParams.set("page", "1");
    setSearchParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function handleStatusChange(status?: ServiceOrderStatus[]) {
    const nextParams = new URLSearchParams(searchParams);
    const serialized = serializeStatus(status);

    if (serialized) {
      nextParams.set("status", serialized);
    } else {
      nextParams.delete("status");
    }

    nextParams.set("page", "1");
    setSearchParams(nextParams);
  }

  function handleDateChange(key: "dateFrom" | "dateTo", value: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    nextParams.set("page", "1");
    setSearchParams(nextParams);
  }

  function handlePageChange(nextPage: number) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(nextPage));
    setSearchParams(nextParams);
  }

  return (
    <section>
      <PageHeader
        title="Ordens de Servico"
        description="Fila operacional da recepcao e da bancada tecnica."
        actions={
          <Link
            to="/service-orders/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <Plus size={17} />
            Nova OS
          </Link>
        }
      />

      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-200 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar OS, cliente, telefone, equipamento..."
          />

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const isActive =
                serializeStatus(filter.value) === activeStatusParam;
              const isPriority = filter.value?.some((status) =>
                priorityStatuses.includes(status)
              );

              return (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => handleStatusChange(filter.value)}
                  className={`h-9 rounded-md px-3 text-sm font-medium ring-1 ring-inset ${
                    isActive
                      ? "bg-sky-600 text-white ring-sky-600"
                      : isPriority
                        ? "bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-100"
                        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-lg">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                De
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) =>
                  handleDateChange("dateFrom", event.target.value)
                }
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Ate
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) =>
                  handleDateChange("dateTo", event.target.value)
                }
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>
        </div>

        {serviceOrdersQuery.isLoading ? (
          <div className="p-4">
            <LoadingState />
          </div>
        ) : serviceOrdersQuery.isError || !serviceOrdersQuery.data ? (
          <div className="p-4">
            <ErrorState
              title="Nao foi possivel carregar as ordens de servico."
              onRetry={() => void serviceOrdersQuery.refetch()}
              isRetrying={serviceOrdersQuery.isFetching}
            />
          </div>
        ) : serviceOrdersQuery.data.data.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Nenhuma OS encontrada para estes filtros." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">OS</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Equipamento</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Atualizada</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceOrdersQuery.data.data.map((serviceOrder) => (
                    <tr key={serviceOrder.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-950">
                        #{serviceOrder.number}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-950">
                          {serviceOrder.customer.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {serviceOrder.customer.phone}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-950">
                          {serviceOrder.equipment.brand}{" "}
                          {serviceOrder.equipment.model}
                        </p>
                        <p className="text-xs text-slate-500">
                          {serviceOrder.equipment.type}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          type="service-order"
                          value={serviceOrder.status}
                        />
                        <span className="sr-only">
                          {serviceOrderStatusLabels[serviceOrder.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(serviceOrder.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/service-orders/${serviceOrder.id}`}
                          className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-white"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              meta={serviceOrdersQuery.data.meta}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </section>
  );
}
