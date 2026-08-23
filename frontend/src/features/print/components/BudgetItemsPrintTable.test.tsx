import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BudgetItem } from "../../service-orders/types/serviceOrder";
import { BudgetItemsPrintTable } from "./BudgetItemsPrintTable";

const partItem: BudgetItem = {
  id: "part-item",
  type: "PART",
  description: "Snapshot SSD 480GB",
  partId: "part-id",
  quantity: 1,
  unitPrice: "250",
  part: {
    id: "part-id",
    name: "Current renamed SSD",
  },
};

const serviceItem: BudgetItem = {
  id: "service-item",
  type: "SERVICE",
  description: "Formatação",
  partId: null,
  quantity: 2,
  unitPrice: "50",
  part: null,
};

describe("BudgetItemsPrintTable", () => {
  it("prints mixed items with type, snapshot, and subtotals", () => {
    render(<BudgetItemsPrintTable items={[partItem, serviceItem]} />);

    expect(screen.getByText("Peça")).toBeInTheDocument();
    expect(screen.getByText("Serviço")).toBeInTheDocument();
    expect(screen.getByText("Snapshot SSD 480GB")).toBeInTheDocument();
    expect(screen.queryByText("Current renamed SSD")).not.toBeInTheDocument();
    expect(screen.getByText("Formatação")).toBeInTheDocument();
    expect(screen.getAllByText(/100,00/).length).toBeGreaterThan(0);
  });

  it("prints SERVICE-only without accessing a Part", () => {
    render(<BudgetItemsPrintTable items={[serviceItem]} />);

    expect(screen.getByText("Serviço")).toBeInTheDocument();
    expect(screen.getByText("Formatação")).toBeInTheDocument();
    expect(screen.queryByText("Peça")).not.toBeInTheDocument();
  });
});
