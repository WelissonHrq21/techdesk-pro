import { PackageCheck } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { formatCurrency } from "../../../utils/formatters";
import type { BudgetSummary } from "../types/serviceOrder";
import type { ConsumptionSummary } from "../utils/serviceOrderDerivedData";

type MaintenancePartsProps = {
  currentBudget: BudgetSummary | null;
  consumedByPartId: Record<string, number>;
  consumptionSummaryByPartId: Record<string, ConsumptionSummary>;
  canConsume: boolean;
  onConsume: (item: BudgetSummary["budgetItems"][number]) => void;
};

export function MaintenanceParts({
  currentBudget,
  consumedByPartId,
  consumptionSummaryByPartId,
  canConsume,
  onConsume,
}: MaintenancePartsProps) {
  if (!currentBudget) {
    return <EmptyState title="Nenhum orçamento aprovado encontrado." />;
  }

  return (
    <div className="space-y-3">
      {currentBudget.budgetItems.map((item) => {
        const consumed = consumedByPartId[item.part.id] ?? 0;
        const summary = consumptionSummaryByPartId[item.part.id];
        const reversed = summary?.reversedQuantity ?? 0;
        const net = summary?.netQuantity ?? consumed;
        const reversible = summary?.reversibleQuantity ?? 0;
        const remaining = item.quantity - consumed;

        return (
          <div
            key={item.id}
            className="rounded-md border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <PackageCheck className="text-sky-600" size={18} />
                  <p className="font-semibold text-slate-950">
                    {item.part.name}
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Aprovado: {item.quantity} - Consumido: {consumed} -
                  Estornado: {reversed}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Consumo líquido: {net} - Saldo reversível: {reversible} -
                  Restante aprovado: {Math.max(remaining, 0)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Valor aprovado: {formatCurrency(item.unitPrice)}
                  {typeof item.part.stock === "number"
                    ? ` - Estoque atual: ${item.part.stock}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onConsume(item)}
                disabled={!canConsume || remaining <= 0}
                className="h-10 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {remaining <= 0 ? "Quantidade já consumida" : "Consumir"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
