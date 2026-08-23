import { ArrowLeft, Edit, PackageMinus, PackagePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Pagination } from "../../../components/ui/Pagination";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../../hooks/useToast";
import { getFriendlyErrorMessage } from "../../../utils/errorMessages";
import { formatCurrency } from "../../../utils/formatters";
import { PartForm } from "../components/PartForm";
import { StockMovementForm } from "../components/StockMovementForm";
import { StockMovementList } from "../components/StockMovementList";
import { StockStatusBadge } from "../components/StockStatusBadge";
import {
  useCreateStockEntry,
  useCreateStockExit,
  useDeactivatePart,
  usePart,
  usePartStockMovements,
  useUpdatePart,
} from "../hooks/useParts";
import type {
  PartFormData,
  StockEntryData,
  StockExitData,
  StockMovementType,
} from "../types/part";

const movementPageSize = 20;

export function PartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const partId = id ?? "";
  const { user } = useAuth();
  const { showToast } = useToast();
  const partQuery = usePart(partId);
  const [movementPage, setMovementPage] = useState(1);
  const [movementType, setMovementType] = useState<StockMovementType | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const movementsQuery = usePartStockMovements(partId, {
    page: movementPage,
    limit: movementPageSize,
    type: movementType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const [modal, setModal] = useState<
    "edit" | "entry" | "exit" | "deactivate" | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const updatePartMutation = useUpdatePart(partId);
  const deactivatePartMutation = useDeactivatePart(partId);
  const stockEntryMutation = useCreateStockEntry(partId);
  const stockExitMutation = useCreateStockExit(partId);
  const isAdmin = user?.role === "ADMIN";
  const movements = movementsQuery.data?.data ?? [];

  function closeModal() {
    setModal(null);
    setFormError(null);
  }

  function handleError(error: unknown) {
    setFormError(getFriendlyErrorMessage(error));
    void partQuery.refetch();
    void movementsQuery.refetch();
  }

  function clearMovementFilters() {
    setMovementType("");
    setDateFrom("");
    setDateTo("");
    setMovementPage(1);
  }

  async function handleUpdatePart(data: PartFormData) {
    try {
      await updatePartMutation.mutateAsync(data);
      closeModal();
      showToast("Peça atualizada.", "success");
    } catch (error) {
      handleError(error);
    }
  }

  async function handleEntry(data: StockEntryData) {
    try {
      await stockEntryMutation.mutateAsync(data);
      closeModal();
      showToast("Entrada de estoque registrada.", "success");
    } catch (error) {
      handleError(error);
    }
  }

  async function handleExit(data: StockExitData) {
    try {
      await stockExitMutation.mutateAsync(data);
      closeModal();
      showToast("Saída de estoque registrada.", "success");
    } catch (error) {
      handleError(error);
    }
  }

  async function handleDeactivate() {
    try {
      await deactivatePartMutation.mutateAsync();
      closeModal();
      showToast("Peça desativada.", "success");
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  if (partQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  if (partQuery.isError || !partQuery.data) {
    return (
      <ErrorState
        title="Não foi possível carregar a peça."
        onRetry={() => void partQuery.refetch()}
        isRetrying={partQuery.isFetching}
      />
    );
  }

  const part = partQuery.data;

  return (
    <section>
      <PageHeader
        title={part.name}
        description={part.brand}
        actions={
          <Link
            to="/parts"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-white"
          >
            <ArrowLeft size={17} />
            Voltar
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Preço atual</span>
                <strong className="mt-2 block text-xl text-slate-950">
                  {formatCurrency(part.currentPrice)}
                </strong>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Estoque atual</span>
                <strong className="mt-2 block text-xl text-slate-950">
                  {part.stock}
                </strong>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Estoque mínimo</span>
                <strong className="mt-2 block text-xl text-slate-950">{part.minimumStock}</strong>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Situação do estoque</span>
                <div className="mt-2">
                  <StockStatusBadge status={part.stockStatus} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-950">
                Histórico de estoque
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[180px_1fr_1fr_auto]">
                <label className="text-sm text-slate-600">
                  Tipo
                  <select
                    aria-label="Filtrar movimentos por tipo"
                    value={movementType}
                    onChange={(event) => {
                      setMovementType(event.target.value as StockMovementType | "");
                      setMovementPage(1);
                    }}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950"
                  >
                    <option value="">Todos</option>
                    <option value="ENTRY">Entrada</option>
                    <option value="EXIT">Saída</option>
                    <option value="REVERSAL">Estorno</option>
                  </select>
                </label>
                <label className="text-sm text-slate-600">
                  De
                  <input
                    aria-label="Data inicial dos movimentos"
                    type="date"
                    value={dateFrom}
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      setMovementPage(1);
                    }}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  Até
                  <input
                    aria-label="Data final dos movimentos"
                    type="date"
                    value={dateTo}
                    onChange={(event) => {
                      setDateTo(event.target.value);
                      setMovementPage(1);
                    }}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950"
                  />
                </label>
                <button
                  type="button"
                  onClick={clearMovementFilters}
                  className="h-10 self-end rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Limpar
                </button>
              </div>
            </div>
            <div className="p-5">
              {movementsQuery.isLoading ? (
                <LoadingState />
              ) : movementsQuery.isError ? (
                <ErrorState
                  title="Não foi possível carregar o histórico."
                  onRetry={() => void movementsQuery.refetch()}
                  isRetrying={movementsQuery.isFetching}
                />
              ) : (
                <>
                  <StockMovementList movements={movements} />
                  {movementsQuery.data && (
                    <Pagination
                      meta={movementsQuery.data.meta}
                      onPageChange={setMovementPage}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Dados</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Fornecedor</dt>
                <dd className="font-medium text-slate-950">
                  {part.supplier ?? "Não informado"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-slate-950">
                  {part.active ? "Ativa" : "Inativa"}
                </dd>
              </div>
            </dl>
          </div>

          {isAdmin && (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">Ações</h3>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => setModal("edit")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Edit size={17} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setModal("entry")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  <PackagePlus size={17} />
                  Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setModal("exit")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-amber-200 px-4 text-sm font-medium text-amber-700 hover:bg-amber-50"
                >
                  <PackageMinus size={17} />
                  Saída manual
                </button>
                <button
                  type="button"
                  onClick={() => setModal("deactivate")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 px-4 text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 size={17} />
                  Desativar
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <Modal title="Editar peça" isOpen={modal === "edit"} onClose={closeModal}>
        <PartForm
          mode="edit"
          part={part}
          isSubmitting={updatePartMutation.isPending}
          errorMessage={formError}
          onCancel={closeModal}
          onSubmit={(data) => void handleUpdatePart(data)}
        />
      </Modal>

      <Modal title="Entrada de estoque" isOpen={modal === "entry"} onClose={closeModal}>
        <StockMovementForm
          type="entry"
          isSubmitting={stockEntryMutation.isPending}
          errorMessage={formError}
          onCancel={closeModal}
          onSubmit={(data) => void handleEntry(data)}
        />
      </Modal>

      <Modal title="Saída manual" isOpen={modal === "exit"} onClose={closeModal}>
        <StockMovementForm
          type="exit"
          isSubmitting={stockExitMutation.isPending}
          errorMessage={formError}
          onCancel={closeModal}
          onSubmit={(data) => void handleExit(data)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={modal === "deactivate"}
        title={`Desativar ${part.name}?`}
        description="A peça deixará de aparecer nas operações normais. O histórico será preservado."
        confirmLabel="Desativar"
        isSubmitting={deactivatePartMutation.isPending}
        onCancel={closeModal}
        onConfirm={() => void handleDeactivate()}
      />
      {formError && modal === "deactivate" && (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {formError}
        </p>
      )}
    </section>
  );
}
