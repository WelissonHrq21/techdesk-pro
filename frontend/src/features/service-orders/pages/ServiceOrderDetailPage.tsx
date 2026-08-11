import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import { serviceOrderStatusLabels } from "../../../utils/labels";
import { useServiceOrder } from "../hooks/useServiceOrders";

type LocationState = {
  message?: string;
};

export function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { showToast } = useToast();
  const serviceOrderQuery = useServiceOrder(id);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const state = location.state as LocationState | null;

    if (state?.message) {
      showToast(state.message, "success");
      window.history.replaceState({}, "");
    }
  }, [location.state, showToast]);

  if (serviceOrderQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  if (serviceOrderQuery.isError || !serviceOrderQuery.data) {
    return (
      <ErrorState
        title="Nao foi possivel carregar a OS."
        onRetry={() => void serviceOrderQuery.refetch()}
        isRetrying={serviceOrderQuery.isFetching}
      />
    );
  }

  const serviceOrder = serviceOrderQuery.data;
  const consumedParts = serviceOrder.stockMovements.filter(
    (movement) => movement.type === "EXIT"
  );

  return (
    <section>
      <PageHeader
        title={`OS #${serviceOrder.number}`}
        description={`Aberta em ${formatDateTime(serviceOrder.createdAt)}`}
        actions={
          <StatusBadge type="service-order" value={serviceOrder.status} />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Cliente e equipamento
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Cliente</span>
                <Link
                  to={`/customers/${serviceOrder.customer.id}`}
                  className="mt-1 block font-semibold text-sky-700 hover:text-sky-800"
                >
                  {serviceOrder.customer.name}
                </Link>
                <p className="mt-1 text-sm text-slate-500">
                  {serviceOrder.customer.phone}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Equipamento</span>
                <p className="mt-1 font-semibold text-slate-950">
                  {serviceOrder.equipment.brand} {serviceOrder.equipment.model}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {serviceOrder.equipment.type} - Serial:{" "}
                  {serviceOrder.equipment.serialNumber ?? "Nao informado"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Defeito / Diagnostico
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-slate-500">Defeito relatado</span>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-950">
                  {serviceOrder.reportedIssue}
                </p>
              </div>
              <div>
                <span className="text-sm text-slate-500">Diagnostico</span>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-950">
                  {serviceOrder.diagnosis || "Ainda nao informado."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Acessorios recebidos
            </h3>
            {serviceOrder.accessories.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Nenhum acessorio registrado." />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {serviceOrder.accessories.map((accessory, index) => (
                  <div
                    key={accessory.id ?? index}
                    className="rounded-md border border-slate-200 p-3"
                  >
                    <p className="font-medium text-slate-950">
                      {accessory.quantity}x {accessory.description}
                    </p>
                    {accessory.observation && (
                      <p className="mt-1 text-sm text-slate-500">
                        {accessory.observation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Orcamentos
            </h3>
            {serviceOrder.budgets.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Nenhum orcamento criado." />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {serviceOrder.budgets.map((budget) => (
                  <div
                    key={budget.id}
                    className="rounded-md border border-slate-200 p-4"
                  >
                    <p className="text-sm text-slate-500">
                      Orcamento V{budget.version}
                    </p>
                    <strong className="mt-1 block text-xl text-slate-950">
                      {formatCurrency(budget.totalValue)}
                    </strong>
                    <p className="mt-1 text-sm text-slate-500">
                      {budget.budgetItems.length} itens
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Senha do equipamento
            </h3>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-950">
                {serviceOrder.password
                  ? showPassword
                    ? serviceOrder.password
                    : "********"
                  : "Nao informada"}
              </span>
              {serviceOrder.password && (
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="rounded-md p-2 text-slate-600 hover:bg-white"
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Historico
            </h3>
            {serviceOrder.serviceOrderHistories.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Nenhum historico registrado.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {serviceOrder.serviceOrderHistories.map((history) => (
                  <div
                    key={history.id}
                    className="border-l-2 border-sky-200 pl-3"
                  >
                    <p className="text-xs text-slate-500">
                      {formatDateTime(history.createdAt)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-950">
                      {serviceOrderStatusLabels[history.previousStatus]} -{" "}
                      {serviceOrderStatusLabels[history.newStatus]}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {history.user?.name ?? "Sistema"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Pecas consumidas
            </h3>
            {consumedParts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Nenhuma peca consumida.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {consumedParts.map((movement) => (
                  <div
                    key={movement.id}
                    className="rounded-md border border-slate-200 p-3"
                  >
                    <p className="text-sm font-medium text-slate-950">
                      {movement.quantity}x {movement.part.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {movement.user?.name ?? "Sistema"} -{" "}
                      {formatDateTime(movement.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
