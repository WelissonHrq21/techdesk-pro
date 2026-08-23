import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import { useServiceOrder } from "../../service-orders/hooks/useServiceOrders";
import { useCompanySettings } from "../../settings/hooks/useCompanySettings";
import { PrintLayout } from "../components/PrintLayout";
import { PrintSection } from "../components/PrintSection";

export function BudgetPrintPage() {
  const { id, budgetId } = useParams<{ id: string; budgetId: string }>();
  const serviceOrderQuery = useServiceOrder(id);
  const companySettingsQuery = useCompanySettings();
  const budget = useMemo(() => {
    return serviceOrderQuery.data?.budgets.find((item) => item.id === budgetId);
  }, [budgetId, serviceOrderQuery.data?.budgets]);

  if (serviceOrderQuery.isLoading || companySettingsQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  if (
    serviceOrderQuery.isError ||
    companySettingsQuery.isError ||
    !serviceOrderQuery.data ||
    !budget
  ) {
    return (
      <ErrorState
        title="Não foi possível carregar o orçamento."
        onRetry={() => void serviceOrderQuery.refetch()}
        isRetrying={serviceOrderQuery.isFetching}
      />
    );
  }

  const serviceOrder = serviceOrderQuery.data;

  return (
    <PrintLayout
      title={`Orçamento V${budget.version}`}
      companySettings={companySettingsQuery.data}
    >
      <PrintSection title="Identificação">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <strong>OS:</strong> #{serviceOrder.number}
          </p>
          <p>
            <strong>Versão:</strong> V{budget.version}
          </p>
          <p>
            <strong>Data:</strong> {formatDateTime(budget.createdAt)}
          </p>
        </div>
      </PrintSection>

      <PrintSection title="Cliente e equipamento">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <strong>Cliente:</strong> {serviceOrder.customer.name}
          </p>
          <p>
            <strong>Telefone:</strong> {serviceOrder.customer.phone}
          </p>
          <p>
            <strong>Equipamento:</strong> {serviceOrder.equipment.brand}{" "}
            {serviceOrder.equipment.model}
          </p>
          <p>
            <strong>Serial:</strong>{" "}
            {serviceOrder.equipment.serialNumber ?? "Não informado"}
          </p>
        </div>
      </PrintSection>

      <PrintSection title="Itens">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 text-right font-semibold">Qtd.</th>
              <th className="py-2 text-right font-semibold">Valor unit.</th>
              <th className="py-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {budget.budgetItems.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2">
                  {item.description ?? item.part?.name}
                </td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-2 text-right">
                  {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-72 border-t border-slate-300 pt-3 text-right">
            <span className="text-sm uppercase text-slate-500">Total</span>
            <strong className="mt-1 block text-2xl">
              {formatCurrency(budget.totalValue)}
            </strong>
          </div>
        </div>
      </PrintSection>

      <PrintSection title="Observações e aprovação">
        <p className="text-sm">Validade do orçamento: conforme política comercial.</p>
        <p className="mt-3 text-sm">Observações:</p>
        <div className="mt-10 grid grid-cols-2 gap-12 text-center text-sm">
          <div className="border-t border-slate-400 pt-2">Aprovação do cliente</div>
          <div className="border-t border-slate-400 pt-2">
            Responsável pela assistência
          </div>
        </div>
      </PrintSection>
    </PrintLayout>
  );
}
