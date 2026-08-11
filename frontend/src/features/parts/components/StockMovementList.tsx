import { Link } from "react-router-dom";
import { EmptyState } from "../../../components/ui/EmptyState";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { formatDateTime } from "../../../utils/formatters";
import { stockMovementTypeLabels } from "../../../utils/labels";
import type { StockMovement } from "../types/part";

type StockMovementListProps = {
  movements: StockMovement[];
};

export function StockMovementList({ movements }: StockMovementListProps) {
  if (movements.length === 0) {
    return <EmptyState title="Nenhum historico de estoque encontrado." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Data</th>
            <th className="px-4 py-3 font-semibold">Tipo</th>
            <th className="px-4 py-3 font-semibold">Quantidade</th>
            <th className="px-4 py-3 font-semibold">Motivo</th>
            <th className="px-4 py-3 font-semibold">Usuario</th>
            <th className="px-4 py-3 font-semibold">OS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {movements.map((movement) => (
            <tr key={movement.id}>
              <td className="px-4 py-3 text-slate-600">
                {formatDateTime(movement.createdAt)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge type="stock-movement" value={movement.type} />
              </td>
              <td className="px-4 py-3 font-semibold text-slate-950">
                {movement.type === "EXIT" ? "-" : "+"}
                {movement.quantity}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {movement.reason ?? stockMovementTypeLabels[movement.type]}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {movement.user?.name ?? "Sistema"}
              </td>
              <td className="px-4 py-3">
                {movement.serviceOrder ? (
                  <Link
                    to={`/service-orders/${movement.serviceOrder.id}`}
                    className="font-medium text-sky-700 hover:text-sky-800"
                  >
                    #{movement.serviceOrder.number}
                  </Link>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
