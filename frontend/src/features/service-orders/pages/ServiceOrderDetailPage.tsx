import { Copy, Eye, EyeOff, Printer, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../../hooks/useToast";
import type { ServiceOrderStatus } from "../../../types/dashboard";
import { getApiErrorStatus } from "../../../utils/apiError";
import { getFriendlyErrorMessage } from "../../../utils/errorMessages";
import { formatDateTime } from "../../../utils/formatters";
import { BudgetForm } from "../components/BudgetForm";
import { BudgetList } from "../components/BudgetList";
import { ConsumePartForm } from "../components/ConsumePartForm";
import { DiagnosisForm } from "../components/DiagnosisForm";
import { MaintenanceParts } from "../components/MaintenanceParts";
import { ObservationForm } from "../components/ObservationForm";
import { ReverseStockMovementForm } from "../components/ReverseStockMovementForm";
import { ServiceOrderActions } from "../components/ServiceOrderActions";
import { ServiceOrderTimeline } from "../components/ServiceOrderTimeline";
import {
  useApproveBudget,
  useChangeServiceOrderStatus,
  useConsumePart,
  useCreateBudget,
  useCreateBudgetRevision,
  useRejectBudget,
  useReverseStockMovement,
  useServiceOrder,
  useUpdateDiagnosis,
} from "../hooks/useServiceOrders";
import type {
  BudgetFormData,
  BudgetRevisionFormData,
  BudgetSummary,
} from "../types/serviceOrder";
import {
  getAvailableActions,
  type ServiceOrderAction,
} from "../utils/getAvailableActions";
import {
  getConsumedByPartId,
  getConsumptionSummaries,
  getCurrentBudget,
  type ConsumptionSummary,
} from "../utils/serviceOrderDerivedData";

type LocationState = {
  message?: string;
};

type StatusActionConfig = {
  targetStatus: ServiceOrderStatus;
  title: string;
  description: string;
  submitLabel: string;
  successMessage: string;
  defaultObservation?: string;
};

const statusActionConfig: Partial<Record<ServiceOrderAction, StatusActionConfig>> =
  {
    START_ANALYSIS: {
      targetStatus: "IN_ANALYSIS",
      title: "Iniciar análise",
      description: "Iniciar análise técnica desta OS?",
      submitLabel: "Iniciar análise",
      successMessage: "Análise iniciada.",
      defaultObservation: "Equipamento encaminhado para bancada.",
    },
    SEND_FOR_APPROVAL: {
      targetStatus: "AWAITING_APPROVAL",
      title: "Enviar para aprovação",
      description: "Enviar o orçamento atual para decisão do cliente?",
      submitLabel: "Enviar para aprovação",
      successMessage: "Orçamento enviado para aprovação.",
      defaultObservation: "Orçamento enviado ao cliente.",
    },
    RETURN_TO_ANALYSIS: {
      targetStatus: "IN_ANALYSIS",
      title: "Voltar para análise",
      description: "Retomar a análise após rejeição do cliente?",
      submitLabel: "Voltar para análise",
      successMessage: "OS voltou para análise.",
    },
    START_MAINTENANCE: {
      targetStatus: "IN_MAINTENANCE",
      title: "Iniciar manutenção",
      description: "Iniciar ou retomar a manutenção desta OS?",
      submitLabel: "Iniciar manutenção",
      successMessage: "Manutenção iniciada.",
    },
    FINISH: {
      targetStatus: "FINISHED",
      title: "Finalizar serviço",
      description: "Finalizar o serviço técnico desta OS?",
      submitLabel: "Finalizar serviço",
      successMessage: "Serviço finalizado.",
    },
    MARK_AWAITING_PICKUP: {
      targetStatus: "AWAITING_PICKUP",
      title: "Aguardando retirada",
      description: "Marcar esta OS como aguardando retirada?",
      submitLabel: "Marcar aguardando retirada",
      successMessage: "OS marcada como aguardando retirada.",
    },
    DELIVER: {
      targetStatus: "DELIVERED",
      title: "Registrar entrega",
      description: "Registrar entrega e encerrar esta OS?",
      submitLabel: "Confirmar entrega",
      successMessage: "Equipamento entregue.",
    },
  };

function buildInitialParts(currentBudget: BudgetSummary | null) {
  if (!currentBudget) {
    return {};
  }

  return currentBudget.budgetItems.reduce<
    Record<
      string,
      {
        id: string;
        name: string;
        brand: string;
        currentPrice: string;
        stock: number;
      }
    >
  >((accumulator, item) => {
    accumulator[item.part.id] = {
      id: item.part.id,
      name: item.part.name,
      brand: item.part.brand ?? "Sem marca",
      currentPrice: item.part.currentPrice ?? item.unitPrice,
      stock: item.part.stock ?? 0,
    };

    return accumulator;
  }, {});
}

export function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const serviceOrderQuery = useServiceOrder(id);
  const [showPassword, setShowPassword] = useState(false);
  const [activeStatusAction, setActiveStatusAction] =
    useState<ServiceOrderAction | null>(null);
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [consumeItem, setConsumeItem] = useState<
    BudgetSummary["budgetItems"][number] | null
  >(null);
  const [reverseSummary, setReverseSummary] =
    useState<ConsumptionSummary | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const serviceOrder = serviceOrderQuery.data;
  const serviceOrderId = id ?? "";
  const currentBudget = serviceOrder ? getCurrentBudget(serviceOrder) : null;
  const consumedByPartId = useMemo(() => {
    return serviceOrder ? getConsumedByPartId(serviceOrder) : {};
  }, [serviceOrder]);
  const consumptionSummaries = useMemo(() => {
    return serviceOrder ? getConsumptionSummaries(serviceOrder) : [];
  }, [serviceOrder]);
  const consumptionSummaryByPartId = useMemo(() => {
    return consumptionSummaries.reduce<Record<string, ConsumptionSummary>>(
      (accumulator, summary) => {
        const current = accumulator[summary.movement.part.id];

        accumulator[summary.movement.part.id] = current
          ? {
              ...summary,
              consumedQuantity:
                current.consumedQuantity + summary.consumedQuantity,
              reversedQuantity:
                current.reversedQuantity + summary.reversedQuantity,
              netQuantity: current.netQuantity + summary.netQuantity,
              reversibleQuantity:
                current.reversibleQuantity + summary.reversibleQuantity,
            }
          : summary;

        return accumulator;
      },
      {}
    );
  }, [consumptionSummaries]);
  const availableActions = serviceOrder
    ? getAvailableActions({
        status: serviceOrder.status,
        role: user?.role ?? "RECEPTION",
        hasBudget: serviceOrder.budgets.length > 0,
      })
    : [];
  const changeStatusMutation = useChangeServiceOrderStatus(serviceOrderId);
  const updateDiagnosisMutation = useUpdateDiagnosis(serviceOrderId);
  const createBudgetMutation = useCreateBudget(serviceOrderId);
  const createRevisionMutation = useCreateBudgetRevision(serviceOrderId);
  const approveBudgetMutation = useApproveBudget(serviceOrderId);
  const rejectBudgetMutation = useRejectBudget(serviceOrderId);
  const consumePartMutation = useConsumePart(serviceOrderId);
  const reverseStockMovementMutation =
    useReverseStockMovement(serviceOrderId);

  useEffect(() => {
    const state = location.state as LocationState | null;

    if (state?.message) {
      showToast(state.message, "success");
      window.history.replaceState({}, "");
    }
  }, [location.state, showToast]);

  function resetModalState() {
    setActiveStatusAction(null);
    setIsDiagnosisOpen(false);
    setIsBudgetOpen(false);
    setIsRevisionOpen(false);
    setDecisionType(null);
    setConsumeItem(null);
    setReverseSummary(null);
    setFormError(null);
  }

  function handleError(error: unknown) {
    setFormError(getFriendlyErrorMessage(error));
    void serviceOrderQuery.refetch();
  }

  function handleAction(action: ServiceOrderAction) {
    setFormError(null);

    if (action === "EDIT_DIAGNOSIS") {
      setIsDiagnosisOpen(true);
      return;
    }

    if (action === "CREATE_BUDGET") {
      setIsBudgetOpen(true);
      return;
    }

    if (action === "APPROVE_BUDGET" || action === "REJECT_BUDGET") {
      if (!currentBudget) {
        showToast("Nenhum orçamento atual encontrado.", "error");
        return;
      }

      setDecisionType(action === "APPROVE_BUDGET" ? "approve" : "reject");
      return;
    }

    if (action === "CONSUME_PART") {
      const nextItem = currentBudget?.budgetItems.find((item) => {
        const consumed = consumedByPartId[item.part.id] ?? 0;
        return consumed < item.quantity;
      });

      if (!nextItem) {
        showToast("Nenhuma quantidade aprovada pendente para consumo.", "info");
        return;
      }

      setConsumeItem(nextItem);
      return;
    }

    if (action === "REVISE_BUDGET") {
      setIsRevisionOpen(true);
      return;
    }

    setActiveStatusAction(action);
  }

  async function handleCopyPublicLink() {
    const url = `${window.location.origin}/track/${serviceOrder?.publicToken}`;

    try {
      await navigator.clipboard.writeText(url);
      showToast("Link de consulta copiado.", "success");
    } catch {
      showToast(url, "info");
    }
  }

  async function handleStatusSubmit(data: { observation?: string }) {
    if (!activeStatusAction) {
      return;
    }

    const config = statusActionConfig[activeStatusAction];

    if (!config) {
      return;
    }

    try {
      await changeStatusMutation.mutateAsync({
        status: config.targetStatus,
        observation: data.observation,
      });
      resetModalState();
      showToast(config.successMessage, "success");
    } catch (error) {
      handleError(error);
    }
  }

  async function handleDiagnosisSubmit(data: { diagnosis: string }) {
    try {
      await updateDiagnosisMutation.mutateAsync(data);
      resetModalState();
      showToast("Diagnóstico salvo.", "success");
    } catch (error) {
      handleError(error);
    }
  }

  async function handleCreateBudget(data: BudgetFormData) {
    try {
      await createBudgetMutation.mutateAsync(data);
      resetModalState();
      showToast("Orçamento criado.", "success");
    } catch (error) {
      handleError(error);
    }
  }

  async function handleCreateRevision(data: BudgetRevisionFormData) {
    try {
      await createRevisionMutation.mutateAsync(data);
      resetModalState();
      showToast("Revisão enviada para aprovação.", "success");
    } catch (error) {
      handleError(error);
    }
  }

  async function handleDecisionSubmit(data: { observation?: string }) {
    if (!decisionType || !currentBudget) {
      return;
    }

    try {
      if (decisionType === "approve") {
        await approveBudgetMutation.mutateAsync({
          budgetId: currentBudget.id,
          data,
        });
        showToast("Orçamento aprovado.", "success");
      } else {
        await rejectBudgetMutation.mutateAsync({
          budgetId: currentBudget.id,
          data,
        });
        showToast("Orçamento rejeitado.", "success");
      }

      resetModalState();
    } catch (error) {
      handleError(error);
    }
  }

  async function handleConsumePart(data: {
    quantity: number;
    observation?: string;
  }) {
    if (!consumeItem) {
      return;
    }

    try {
      await consumePartMutation.mutateAsync({
        partId: consumeItem.part.id,
        quantity: data.quantity,
        observation: data.observation,
      });
      resetModalState();
      showToast("Peça consumida com sucesso.", "success");
    } catch (error) {
      handleError(error);
    }
  }

  async function handleReverseStockMovement(data: {
    quantity: number;
    reason: string;
  }) {
    if (!reverseSummary) {
      return;
    }

    try {
      const result = await reverseStockMovementMutation.mutateAsync({
        movementId: reverseSummary.movement.id,
        quantity: data.quantity,
        reason: data.reason,
      });
      resetModalState();
      showToast(
        result.reversibleQuantity === 0
          ? "Consumo estornado com sucesso."
          : `${data.quantity} unidade estornada com sucesso.`,
        "success"
      );
    } catch (error) {
      const status = getApiErrorStatus(error);
      const message =
        status === 409
          ? "Esse consumo já foi estornado total ou parcialmente por outra operação. Os dados foram atualizados."
          : getFriendlyErrorMessage(error);

      setFormError(message);

      if (status === 409) {
        showToast(message, "error");
      }

      void serviceOrderQuery.refetch();
    }
  }

  if (serviceOrderQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  if (serviceOrderQuery.isError || !serviceOrder) {
    return (
      <ErrorState
        title="Não foi possível carregar a OS."
        onRetry={() => void serviceOrderQuery.refetch()}
        isRetrying={serviceOrderQuery.isFetching}
      />
    );
  }

  const canReverseStock =
    (user?.role === "ADMIN" || user?.role === "TECHNICIAN") &&
    (serviceOrder.status === "IN_MAINTENANCE" ||
      serviceOrder.status === "FINISHED");
  const revisionDefaultItems =
    currentBudget?.budgetItems.map((item) => ({
      partId: item.part.id,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })) ?? [];
  const statusConfig = activeStatusAction
    ? statusActionConfig[activeStatusAction]
    : undefined;
  const unconsumedItems =
    currentBudget?.budgetItems.filter((item) => {
      const consumed = consumedByPartId[item.part.id] ?? 0;
      return consumed < item.quantity;
    }) ?? [];

  return (
    <section>
      <PageHeader
        title={`OS #${serviceOrder.number}`}
        description={`Aberta em ${formatDateTime(serviceOrder.createdAt)}`}
        actions={
          <StatusBadge type="service-order" value={serviceOrder.status} />
        }
      />

      <div className="mb-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {serviceOrder.customer.name}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {serviceOrder.equipment.brand} {serviceOrder.equipment.model}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {serviceOrder.equipment.type} - Serial:{" "}
              {serviceOrder.equipment.serialNumber ?? "Não informado"}
            </p>
          </div>

          <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
            <ServiceOrderActions
              actions={availableActions}
              onAction={handleAction}
            />
            <Link
              to={`/service-orders/${serviceOrder.id}/print`}
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer size={17} />
              Imprimir protocolo
            </Link>
            <button
              type="button"
              onClick={() => void handleCopyPublicLink()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Copy size={17} />
              Copiar link do cliente
            </button>
          </div>
        </div>

        {availableActions.length === 0 && serviceOrder.status === "DELIVERED" && (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Atendimento encerrado.
          </p>
        )}
        {(serviceOrder.status === "AWAITING_APPROVAL" ||
          serviceOrder.status === "BUDGET_CHANGED_AWAITING_APPROVAL") && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Orçamento aguardando decisão do cliente.
          </p>
        )}
        {serviceOrder.status === "BUDGET_REJECTED" && (
          <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Orçamento rejeitado. A bancada pode retomar a análise e gerar uma nova
            versão.
          </p>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Atendimento
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-slate-500">Defeito relatado</span>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-950">
                  {serviceOrder.reportedIssue}
                </p>
              </div>
              <div>
                <span className="text-sm text-slate-500">Diagnóstico</span>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-950">
                  {serviceOrder.diagnosis || "Ainda não informado."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Orçamentos
            </h3>
            <div className="mt-4">
              <BudgetList
                budgets={serviceOrder.budgets}
                currentBudgetId={currentBudget?.id}
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-950">
                Manutenção
              </h3>
              {currentBudget && (
                <span className="text-sm text-slate-500">
                  Base: Orçamento V{currentBudget.version}
                </span>
              )}
            </div>
            <div className="mt-4">
              <MaintenanceParts
                currentBudget={currentBudget}
                consumedByPartId={consumedByPartId}
                consumptionSummaryByPartId={consumptionSummaryByPartId}
                canConsume={availableActions.includes("CONSUME_PART")}
                onConsume={setConsumeItem}
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Acessórios recebidos
            </h3>
            {serviceOrder.accessories.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Nenhum acessório registrado." />
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
        </div>

        <aside className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Cliente e equipamento
            </h3>
            <div className="mt-4 space-y-3">
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
                <span className="text-sm text-slate-500">
                  Senha do equipamento
                </span>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-950">
                    {serviceOrder.password
                      ? showPassword
                        ? serviceOrder.password
                        : "********"
                      : "Não informada"}
                  </span>
                  {serviceOrder.password && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="rounded-md p-2 text-slate-600 hover:bg-white"
                      title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Peças consumidas
            </h3>
            {consumptionSummaries.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Nenhuma peça consumida.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {consumptionSummaries.map((summary) => (
                  <div
                    key={summary.movement.id}
                    className="rounded-md border border-slate-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge type="stock-movement" value="EXIT" />
                          <p className="text-sm font-medium text-slate-950">
                            {summary.movement.part.name}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {summary.movement.user?.name ?? "Sistema"} -{" "}
                          {formatDateTime(summary.movement.createdAt)}
                        </p>
                      </div>

                      {canReverseStock && summary.reversibleQuantity > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormError(null);
                            setReverseSummary(summary);
                          }}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-teal-200 px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                        >
                          <RotateCcw size={15} />
                          Estornar
                        </button>
                      )}
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-rose-50 px-2 py-2">
                        <dt className="text-rose-700">Consumido</dt>
                        <dd className="font-semibold text-rose-800">
                          -{summary.consumedQuantity}
                        </dd>
                      </div>
                      <div className="rounded-md bg-teal-50 px-2 py-2">
                        <dt className="text-teal-700">Estornado</dt>
                        <dd className="font-semibold text-teal-800">
                          +{summary.reversedQuantity}
                        </dd>
                      </div>
                      <div className="rounded-md bg-slate-50 px-2 py-2">
                        <dt className="text-slate-500">Consumo líquido</dt>
                        <dd className="font-semibold text-slate-950">
                          {summary.netQuantity}
                        </dd>
                      </div>
                      <div className="rounded-md bg-sky-50 px-2 py-2">
                        <dt className="text-sky-700">Saldo reversível</dt>
                        <dd className="font-semibold text-sky-800">
                          {summary.reversibleQuantity}
                        </dd>
                      </div>
                    </dl>

                    {summary.movement.reason && (
                      <p className="mt-2 rounded-md bg-slate-50 px-2 py-2 text-xs text-slate-600">
                        {summary.movement.reason}
                      </p>
                    )}

                    {summary.reversals.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        {summary.reversals.map((reversal) => (
                          <div
                            key={reversal.id}
                            className="rounded-md border border-teal-100 bg-teal-50 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <StatusBadge
                                type="stock-movement"
                                value="REVERSAL"
                              />
                              <span className="text-xs font-semibold text-teal-800">
                                +{reversal.quantity}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-teal-700">
                              {reversal.user?.name ?? "Sistema"} -{" "}
                              {formatDateTime(reversal.createdAt)}
                            </p>
                            {reversal.reason && (
                              <p className="mt-1 text-xs text-teal-700">
                                {reversal.reason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Histórico
            </h3>
            <ServiceOrderTimeline
              histories={serviceOrder.serviceOrderHistories}
            />
          </div>
        </aside>
      </div>

      <Modal
        title={statusConfig?.title ?? "Atualizar status"}
        isOpen={Boolean(statusConfig)}
        onClose={resetModalState}
        maxWidth="max-w-lg"
      >
        {statusConfig && (
          <>
            <p className="mb-4 text-sm text-slate-600">
              {statusConfig.description}
            </p>
            {activeStatusAction === "FINISH" && unconsumedItems.length > 0 && (
              <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <p className="font-medium">Peças aprovadas não consumidas:</p>
                <ul className="mt-1 list-inside list-disc">
                  {unconsumedItems.map((item) => {
                    const consumed = consumedByPartId[item.part.id] ?? 0;
                    return (
                      <li key={item.id}>
                        {item.part.name} x{item.quantity - consumed}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <ObservationForm
              defaultObservation={statusConfig.defaultObservation}
              submitLabel={statusConfig.submitLabel}
              isSubmitting={changeStatusMutation.isPending}
              errorMessage={formError}
              onCancel={resetModalState}
              onSubmit={(data) => void handleStatusSubmit(data)}
            />
          </>
        )}
      </Modal>

      <Modal
        title={
          serviceOrder.diagnosis ? "Editar diagnóstico" : "Registrar diagnóstico"
        }
        isOpen={isDiagnosisOpen}
        onClose={resetModalState}
        maxWidth="max-w-2xl"
      >
        <DiagnosisForm
          defaultDiagnosis={serviceOrder.diagnosis}
          isSubmitting={updateDiagnosisMutation.isPending}
          errorMessage={formError}
          onCancel={resetModalState}
          onSubmit={(data) => void handleDiagnosisSubmit(data)}
        />
      </Modal>

      <Modal
        title="Criar orçamento"
        isOpen={isBudgetOpen}
        onClose={resetModalState}
        maxWidth="max-w-5xl"
      >
        <BudgetForm
          mode="create"
          isSubmitting={createBudgetMutation.isPending}
          errorMessage={formError}
          onCancel={resetModalState}
          onSubmit={(data) => void handleCreateBudget(data as BudgetFormData)}
        />
      </Modal>

      <Modal
        title="Revisar orçamento"
        isOpen={isRevisionOpen}
        onClose={resetModalState}
        maxWidth="max-w-5xl"
      >
        <BudgetForm
          mode="revision"
          defaultItems={revisionDefaultItems}
          initialParts={buildInitialParts(currentBudget)}
          consumedByPartId={consumedByPartId}
          isSubmitting={createRevisionMutation.isPending}
          errorMessage={formError}
          onCancel={resetModalState}
          onSubmit={(data) =>
            void handleCreateRevision(data as BudgetRevisionFormData)
          }
        />
      </Modal>

      <Modal
        title={
          decisionType === "approve"
            ? "Registrar aprovação"
            : "Registrar rejeição"
        }
        isOpen={Boolean(decisionType)}
        onClose={resetModalState}
        maxWidth="max-w-lg"
      >
        <p className="mb-4 text-sm text-slate-600">
          {decisionType === "approve"
            ? `Registrar aprovação do orçamento V${currentBudget?.version}?`
            : `Registrar rejeição do orçamento V${currentBudget?.version}?`}
        </p>
        <ObservationForm
          defaultObservation={
            decisionType === "approve"
              ? "Cliente aprovou o orçamento."
              : "Cliente rejeitou o orçamento."
          }
          submitLabel={
            decisionType === "approve"
              ? "Registrar aprovação"
              : "Registrar rejeição"
          }
          isSubmitting={
            approveBudgetMutation.isPending || rejectBudgetMutation.isPending
          }
          errorMessage={formError}
          onCancel={resetModalState}
          onSubmit={(data) => void handleDecisionSubmit(data)}
        />
      </Modal>

      <Modal
        title="Consumir peça"
        isOpen={Boolean(consumeItem)}
        onClose={resetModalState}
        maxWidth="max-w-lg"
      >
        {consumeItem && (
          <ConsumePartForm
            item={consumeItem}
            consumed={consumedByPartId[consumeItem.part.id] ?? 0}
            isSubmitting={consumePartMutation.isPending}
            errorMessage={formError}
            onCancel={resetModalState}
            onSubmit={(data) => void handleConsumePart(data)}
          />
        )}
      </Modal>

      <Modal
        title="Estornar consumo"
        isOpen={Boolean(reverseSummary)}
        onClose={resetModalState}
        maxWidth="max-w-2xl"
      >
        {reverseSummary && (
          <ReverseStockMovementForm
            summary={reverseSummary}
            isSubmitting={reverseStockMovementMutation.isPending}
            errorMessage={formError}
            onCancel={resetModalState}
            onSubmit={(data) => void handleReverseStockMovement(data)}
          />
        )}
      </Modal>
    </section>
  );
}
