import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Pagination } from "../../../components/ui/Pagination";
import { SearchInput } from "../../../components/ui/SearchInput";
import { useAuth } from "../../../hooks/useAuth";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useToast } from "../../../hooks/useToast";
import { getFriendlyErrorMessage } from "../../../utils/errorMessages";
import { formatCurrency } from "../../../utils/formatters";
import { PartForm } from "../components/PartForm";
import { StockStatusBadge } from "../components/StockStatusBadge";
import { useCreatePart, useParts } from "../hooks/useParts";
import type { PartFormData, StockStatus } from "../types/part";

const limit = 20;

type StockFilter = "ALL" | StockStatus;

const stockFilters: Array<{ label: string; value: StockFilter }> = [
  { label: "Todos", value: "ALL" },
  { label: "OK", value: "OK" },
  { label: "Baixo estoque", value: "LOW_STOCK" },
  { label: "Sem estoque", value: "OUT_OF_STOCK" },
];

function getStockFilter(value: string | null): StockFilter {
  const legacyMap: Record<string, StockFilter> = {
    all: "ALL",
    low: "LOW_STOCK",
    empty: "OUT_OF_STOCK",
  };
  const normalized = value ? legacyMap[value] ?? value : "ALL";

  return stockFilters.some((filter) => filter.value === normalized)
    ? (normalized as StockFilter)
    : "ALL";
}

export function PartsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const page = Number(searchParams.get("page") ?? "1");
  const activeFilter = getStockFilter(searchParams.get("stock"));
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(search);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const partsQuery = useParts({
    page,
    limit,
    search: debouncedSearch || undefined,
    stockStatus: activeFilter === "ALL" ? undefined : activeFilter,
  });
  const createPartMutation = useCreatePart();

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

  function handleStockFilterChange(filter: StockFilter) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("stock", filter);
    nextParams.set("page", "1");
    setSearchParams(nextParams);
  }

  function handlePageChange(nextPage: number) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(nextPage));
    setSearchParams(nextParams);
  }

  async function handleCreatePart(data: PartFormData) {
    setFormError(null);

    try {
      const part = await createPartMutation.mutateAsync(data);
      setIsCreateOpen(false);
      showToast("Peca cadastrada com sucesso.", "success");
      setTimeout(() => {
        window.location.assign(`/parts/${part.id}`);
      }, 350);
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  return (
    <section>
      <PageHeader
        title="Pecas / Estoque"
        description="Consulta de peças e saldo atual de estoque."
        actions={
          user?.role === "ADMIN" && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
            >
              <Plus size={17} />
              Nova peça
            </button>
          )
        }
      />

      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-200 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome, marca ou fornecedor..."
          />
          <div className="flex flex-wrap gap-2">
            {stockFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => handleStockFilterChange(filter.value)}
                className={`h-9 rounded-md px-3 text-sm font-medium ring-1 ring-inset ${
                  activeFilter === filter.value
                    ? "bg-sky-600 text-white ring-sky-600"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {partsQuery.isLoading ? (
          <div className="p-4">
            <LoadingState />
          </div>
        ) : partsQuery.isError || !partsQuery.data ? (
          <div className="p-4">
            <ErrorState
              title="Não foi possível carregar as peças."
              onRetry={() => void partsQuery.refetch()}
              isRetrying={partsQuery.isFetching}
            />
          </div>
        ) : partsQuery.data.data.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Nenhuma peça encontrada." />
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {partsQuery.data.data.map((part) => (
                <div key={part.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{part.name}</p>
                      <p className="text-sm text-slate-500">{part.brand}</p>
                    </div>
                    <StockStatusBadge status={part.stockStatus} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="block text-slate-500">Estoque</span>
                      <strong className="text-slate-950">{part.stock}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Mínimo</span>
                      <strong className="text-slate-950">{part.minimumStock}</strong>
                    </div>
                  </div>
                  <Link
                    to={`/parts/${part.id}`}
                    className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700"
                  >
                    Ver detalhes
                  </Link>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Peca</th>
                    <th className="px-4 py-3 font-semibold">Marca</th>
                    <th className="px-4 py-3 font-semibold">Preço</th>
                    <th className="px-4 py-3 font-semibold">Estoque</th>
                    <th className="px-4 py-3 font-semibold">Mínimo</th>
                    <th className="px-4 py-3 font-semibold">Situação</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partsQuery.data.data.map((part) => (
                    <tr key={part.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-950">
                        {part.name}
                        {part.supplier && (
                          <span className="mt-1 block text-xs text-slate-500">
                            {part.supplier}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{part.brand}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatCurrency(part.currentPrice)}
                      </td>
                      <td className="px-4 py-3">
                        {part.stock}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {part.minimumStock}
                      </td>
                      <td className="px-4 py-3">
                        <StockStatusBadge status={part.stockStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/parts/${part.id}`}
                          className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-white"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={partsQuery.data.meta} onPageChange={handlePageChange} />
          </>
        )}
      </div>

      <Modal
        title="Nova peça"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      >
        <PartForm
          mode="create"
          isSubmitting={createPartMutation.isPending}
          errorMessage={formError}
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={(data) => void handleCreatePart(data)}
        />
      </Modal>
    </section>
  );
}
