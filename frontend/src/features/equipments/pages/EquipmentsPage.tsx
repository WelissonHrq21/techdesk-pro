import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Pagination } from "../../../components/ui/Pagination";
import { SearchInput } from "../../../components/ui/SearchInput";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useEquipments } from "../hooks/useEquipments";

const limit = 20;

export function EquipmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(search);
  const equipmentsQuery = useEquipments(page, limit, debouncedSearch);

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

  function handlePageChange(nextPage: number) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(nextPage));
    setSearchParams(nextParams);
  }

  return (
    <section>
      <PageHeader
        title="Equipamentos"
        description="Consulta global de equipamentos cadastrados."
      />

      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por tipo, marca, modelo, serial ou cliente..."
          />
        </div>

        {equipmentsQuery.isLoading ? (
          <div className="p-4">
            <LoadingState />
          </div>
        ) : equipmentsQuery.isError || !equipmentsQuery.data ? (
          <div className="p-4">
            <ErrorState
              title="Nao foi possivel carregar os equipamentos."
              onRetry={() => void equipmentsQuery.refetch()}
              isRetrying={equipmentsQuery.isFetching}
            />
          </div>
        ) : equipmentsQuery.data.data.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Nenhum equipamento encontrado." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">Marca</th>
                    <th className="px-4 py-3 font-semibold">Modelo</th>
                    <th className="px-4 py-3 font-semibold">Serial</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipmentsQuery.data.data.map((equipment) => (
                    <tr key={equipment.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">
                        {equipment.type}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {equipment.brand}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {equipment.model}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {equipment.serialNumber ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {equipment.customer ? (
                          <Link
                            to={`/customers/${equipment.customer.id}`}
                            className="font-medium text-sky-700 hover:text-sky-800"
                          >
                            {equipment.customer.name}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              meta={equipmentsQuery.data.meta}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </section>
  );
}
