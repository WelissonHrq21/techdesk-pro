import { StatusBadge } from "../../../components/ui/StatusBadge";
import { formatDateTime } from "../../../utils/formatters";
import { roleLabels, serviceOrderStatusLabels } from "../../../utils/labels";
import type { ServiceOrderHistory } from "../types/serviceOrder";

type ServiceOrderTimelineProps = {
  histories: ServiceOrderHistory[];
};

const transitionLabels: Record<string, string> = {
  "RECEIVED->IN_ANALYSIS": "Iniciou análise",
  "IN_ANALYSIS->AWAITING_APPROVAL": "Orçamento enviado para aprovação",
  "AWAITING_APPROVAL->BUDGET_APPROVED": "Orçamento aprovado",
  "BUDGET_CHANGED_AWAITING_APPROVAL->BUDGET_APPROVED": "Revisão aprovada",
  "AWAITING_APPROVAL->BUDGET_REJECTED": "Orçamento rejeitado",
  "BUDGET_CHANGED_AWAITING_APPROVAL->BUDGET_REJECTED": "Revisão rejeitada",
  "BUDGET_REJECTED->IN_ANALYSIS": "Retomou análise",
  "BUDGET_APPROVED->IN_MAINTENANCE": "Iniciou manutenção",
  "IN_MAINTENANCE->BUDGET_CHANGED_AWAITING_APPROVAL":
    "Revisão enviada para aprovação",
  "IN_MAINTENANCE->FINISHED": "Manutenção finalizada",
  "FINISHED->AWAITING_PICKUP": "Aguardando retirada",
  "AWAITING_PICKUP->DELIVERED": "Equipamento entregue",
};

export function ServiceOrderTimeline({ histories }: ServiceOrderTimelineProps) {
  if (histories.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        Nenhum histórico disponível.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {histories
        .slice()
        .reverse()
        .map((history) => {
          const key = `${history.previousStatus}->${history.newStatus}`;

          return (
            <div key={history.id} className="border-l-2 border-sky-200 pl-3">
              <p className="text-xs text-slate-500">
                {formatDateTime(history.createdAt)}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {transitionLabels[key] ?? "Status atualizado"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge
                  type="service-order"
                  value={history.previousStatus}
                />
                <span className="text-xs text-slate-400">para</span>
                <StatusBadge type="service-order" value={history.newStatus} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {history.user
                  ? `${history.user.name} - ${
                      roleLabels[history.user.role as keyof typeof roleLabels] ??
                      history.user.role
                    }`
                  : "Sistema"}
              </p>
              {history.observation && (
                <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  "{history.observation}"
                </p>
              )}
              <span className="sr-only">
                {serviceOrderStatusLabels[history.previousStatus]} para{" "}
                {serviceOrderStatusLabels[history.newStatus]}
              </span>
            </div>
          );
        })}
    </div>
  );
}
