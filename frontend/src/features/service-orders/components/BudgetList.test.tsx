import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { BudgetSummary } from "../types/serviceOrder";
import { BudgetList } from "./BudgetList";

describe("BudgetList Stage 1 compatibility", () => {
  it("renders legacy PART and SERVICE items without requiring a Part", () => {
    const budget: BudgetSummary = {
      id: "budget-1",
      version: 1,
      totalValue: "350",
      createdAt: "2026-08-22T12:00:00.000Z",
      updatedAt: "2026-08-22T12:00:00.000Z",
      serviceOrderId: "service-order-1",
      budgetItems: [
        {
          id: "part-item",
          quantity: 1,
          unitPrice: "250",
          part: {
            id: "part-1",
            name: "Legacy SSD",
          },
        },
        {
          id: "service-item",
          type: "SERVICE",
          description: "Technical labor",
          partId: null,
          quantity: 1,
          unitPrice: "100",
          part: null,
        },
      ],
    };

    render(
      <MemoryRouter>
        <BudgetList budgets={[budget]} currentBudgetId={budget.id} />
      </MemoryRouter>
    );

    expect(screen.getByText("Legacy SSD")).toBeInTheDocument();
    expect(screen.getByText("Technical labor")).toBeInTheDocument();
  });
});
