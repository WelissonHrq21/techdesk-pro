import { Prisma } from "@prisma/client";
import { PreparedBudgetItem } from "../../types/budget";

export function calculateBudgetTotal(items: PreparedBudgetItem[]) {
  return items.reduce((total, item) => {
    return total.add(
      new Prisma.Decimal(item.unitPrice).mul(item.quantity)
    );
  }, new Prisma.Decimal(0));
}
