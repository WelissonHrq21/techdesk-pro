import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Pagination } from "../../../components/ui/Pagination";
import { SearchInput } from "../../../components/ui/SearchInput";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useToast } from "../../../hooks/useToast";
import { getFriendlyErrorMessage } from "../../../utils/errorMessages";
import { CustomerForm } from "../components/CustomerForm";
import { useCreateCustomer, useCustomers } from "../hooks/useCustomers";
import type { CustomerFormData } from "../types/customer";

const limit = 20;

export function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = Number(searchParams.get("page") ?? "1");
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(search);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { showToast } = useToast();
  const customersQuery = useCustomers(page, limit, debouncedSearch);
  const createCustomerMutation = useCreateCustomer();

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

  async function handleCreateCustomer(data: CustomerFormData) {
    setFormError(null);

    try {
      const customer = await createCustomerMutation.mutateAsync(data);
      setIsCreateOpen(false);
      showToast("Cliente cadastrado. Continue abrindo a OS.", "success");
      navigate(`/service-orders/new?customerId=${customer.id}`);
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  return (
    <section>
      <PageHeader
        title="Clientes"
        description="Busca e cadastro de clientes para atendimento de balcão."
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <Plus size={17} />
            Novo cliente
          </button>
        }
      />

      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome, telefone ou e-mail..."
          />
        </div>

        {customersQuery.isLoading ? (
          <div className="p-4">
            <LoadingState />
          </div>
        ) : customersQuery.isError || !customersQuery.data ? (
          <div className="p-4">
            <ErrorState
              title="Não foi possível carregar os clientes."
              onRetry={() => void customersQuery.refetch()}
              isRetrying={customersQuery.isFetching}
            />
          </div>
        ) : customersQuery.data.data.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Nenhum cliente encontrado." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Telefone</th>
                    <th className="px-4 py-3 font-semibold">E-mail</th>
                    <th className="px-4 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customersQuery.data.data.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {customer.phone}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {customer.email ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              meta={customersQuery.data.meta}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      <Modal
        title="Novo cliente"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      >
        <CustomerForm
          mode="create"
          isSubmitting={createCustomerMutation.isPending}
          errorMessage={formError}
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={handleCreateCustomer}
        />
      </Modal>
    </section>
  );
}
