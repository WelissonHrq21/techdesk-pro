import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../../components/ui/EmptyState";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import type { BudgetSummary } from "../types/serviceOrder";

type BudgetListProps = {
  budgets: BudgetSummary[];
  currentBudgetId?: string;
};

export function BudgetList({ budgets, currentBudgetId }: BudgetListProps) {
  const [expandedId, setExpandedId] = useState(currentBudgetId);

  if (budgets.length === 0) {
    return <EmptyState title="Nenhum orçamento criado." />;
  }

  return (
    <div className="space-y-3">
      {[...budgets]
        .sort((a, b) => b.version - a.version)
        .map((budget) => {
          const isExpanded = expandedId === budget.id;

          return (
            <div
              key={budget.id}
              className="rounded-md border border-slate-200 bg-white"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? undefined : budget.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-950">
                      Orçamento V{budget.version}
                    </span>
                    {budget.id === currentBudgetId && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                        Atual
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Criado em {formatDateTime(budget.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <strong className="text-base text-slate-950">
                    {formatCurrency(budget.totalValue)}
                  </strong>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 transition ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="space-y-3">
                    {budget.budgetItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-2 text-sm sm:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <p className="font-medium text-slate-950">
                            {item.part.name}
                          </p>
                          <p className="text-slate-500">
                            {item.quantity} x {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <strong className="text-slate-950 sm:text-right">
                          {formatCurrency(
                            Number(item.quantity) * Number(item.unitPrice)
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm font-medium text-slate-600">
                      Total
                    </span>
                    <strong className="text-lg text-slate-950">
                      {formatCurrency(budget.totalValue)}
                    </strong>
                  </div>
                  <Link
                    to={`/service-orders/${budget.serviceOrderId}/budgets/${budget.id}/print`}
                    target="_blank"
                    className="mt-4 inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Imprimir orçamento
                  </Link>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
