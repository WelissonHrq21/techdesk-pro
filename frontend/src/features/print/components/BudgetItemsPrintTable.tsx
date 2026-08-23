import { formatCurrency } from "../../../utils/formatters";
import {
  isServiceBudgetItem,
  type BudgetItem,
} from "../../service-orders/types/serviceOrder";

type BudgetItemsPrintTableProps = {
  items: BudgetItem[];
};

export function BudgetItemsPrintTable({
  items,
}: BudgetItemsPrintTableProps) {
  return (
    <table className="w-full table-fixed text-left text-sm">
      <thead>
        <tr className="border-b border-slate-300">
          <th className="w-24 py-2 font-semibold">Tipo</th>
          <th className="py-2 font-semibold">Descrição</th>
          <th className="w-16 py-2 text-right font-semibold">Qtd.</th>
          <th className="w-28 py-2 text-right font-semibold">Unitário</th>
          <th className="w-28 py-2 text-right font-semibold">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-slate-100 align-top">
            <td className="py-2 pr-2 font-medium text-slate-600">
              {isServiceBudgetItem(item) ? "Serviço" : "Peça"}
            </td>
            <td className="break-words py-2 pr-3">
              {item.description ?? item.part?.name}
            </td>
            <td className="py-2 text-right">{item.quantity}</td>
            <td className="py-2 text-right">
              {formatCurrency(item.unitPrice)}
            </td>
            <td className="py-2 text-right">
              {formatCurrency(
                Number(item.quantity) * Number(item.unitPrice)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
