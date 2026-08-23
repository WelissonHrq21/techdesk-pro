import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetSummary } from "../types/serviceOrder";
import { MaintenanceParts } from "./MaintenanceParts";

const mixedBudget: BudgetSummary = {
  id: "budget-id",
  version: 1,
  totalValue: "550",
  createdAt: "2026-08-23T10:00:00.000Z",
  updatedAt: "2026-08-23T10:00:00.000Z",
  serviceOrderId: "service-order-id",
  budgetItems: [
    {
      id: "part-item",
      type: "PART",
      description: "SSD aprovado",
      partId: "part-id",
      quantity: 2,
      unitPrice: "250",
      part: { id: "part-id", name: "SSD atual", stock: 4 },
    },
    {
      id: "service-item",
      type: "SERVICE",
      description: "Mão de obra",
      partId: null,
      quantity: 3,
      unitPrice: "50",
      part: null,
    },
  ],
};

describe("MaintenanceParts mixed budget isolation", () => {
  it("shows only PART as consumable and never renders SERVICE", () => {
    render(
      <MaintenanceParts
        currentBudget={mixedBudget}
        consumedByPartId={{}}
        consumptionSummaryByPartId={{}}
        canConsume
        onConsume={vi.fn()}
      />
    );

    expect(screen.getByText("SSD atual")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /consumir/i })).toBeInTheDocument();
    expect(screen.queryByText("Mão de obra")).not.toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        Boolean(element?.textContent?.startsWith("Aprovado: 2"))
      )
    ).toBeInTheDocument();
  });
});
