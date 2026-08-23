import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServiceOrderDetail } from "../../service-orders/types/serviceOrder";
import { useServiceOrder } from "../../service-orders/hooks/useServiceOrders";
import { useCompanySettings } from "../../settings/hooks/useCompanySettings";
import { BudgetPrintPage } from "./BudgetPrintPage";
import { ServiceOrderReceiptPrintPage } from "./ServiceOrderReceiptPrintPage";

vi.mock("../../service-orders/hooks/useServiceOrders", () => ({
  useServiceOrder: vi.fn(),
}));

vi.mock("../../settings/hooks/useCompanySettings", () => ({
  useCompanySettings: vi.fn(),
}));

const publicToken = "33333333-3333-4333-8333-333333333333";
const serviceOrder: ServiceOrderDetail = {
  id: "service-order-id",
  number: 24,
  publicToken,
  reportedIssue: "Notebook lento",
  diagnosis: null,
  password: null,
  status: "AWAITING_APPROVAL",
  createdAt: "2026-08-23T09:00:00.000Z",
  updatedAt: "2026-08-23T09:30:00.000Z",
  customer: {
    id: "customer-id",
    name: "Cliente Stage 6",
    phone: "85999990000",
    email: null,
    zipCode: null,
    address: null,
    active: true,
    createdAt: "2026-08-23T08:00:00.000Z",
    updatedAt: "2026-08-23T08:00:00.000Z",
  },
  equipment: {
    id: "equipment-id",
    type: "Notebook",
    brand: "Dell",
    model: "Latitude",
    serialNumber: "STAGE6",
    active: true,
    createdAt: "2026-08-23T08:00:00.000Z",
    updatedAt: "2026-08-23T08:00:00.000Z",
  },
  accessories: [],
  budgets: [
    {
      id: "budget-id",
      version: 1,
      totalValue: "350",
      createdAt: "2026-08-23T10:00:00.000Z",
      updatedAt: "2026-08-23T10:00:00.000Z",
      serviceOrderId: "service-order-id",
      budgetItems: [
        {
          id: "part-item",
          type: "PART",
          description: "SSD 480GB",
          partId: "part-id",
          quantity: 1,
          unitPrice: "250",
          part: { id: "part-id", name: "SSD atual" },
        },
        {
          id: "service-item",
          type: "SERVICE",
          description: "Formatação",
          partId: null,
          quantity: 1,
          unitPrice: "100",
          part: null,
        },
      ],
    },
  ],
  serviceOrderHistories: [],
  stockMovements: [],
};

function queryResult<T>(data: T) {
  return {
    data,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
}

describe("tracking QR in printable documents", () => {
  beforeEach(() => {
    vi.mocked(useServiceOrder).mockReturnValue(queryResult(serviceOrder) as never);
    vi.mocked(useCompanySettings).mockReturnValue(
      queryResult({ name: "TechDesk Pro" }) as never
    );
  });

  it("renders the public tracking QR in the service order receipt", () => {
    render(
      <MemoryRouter initialEntries={["/service-orders/service-order-id/print"]}>
        <Routes>
          <Route
            path="/service-orders/:id/print"
            element={<ServiceOrderReceiptPrintPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Acompanhamento público")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /acompanhamento público/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(publicToken) }))
      .toHaveAttribute("href", `${window.location.origin}/track/${publicToken}`);
  });

  it("keeps mixed budget printing and includes the same tracking QR", () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/service-orders/service-order-id/budgets/budget-id/print",
        ]}
      >
        <Routes>
          <Route
            path="/service-orders/:id/budgets/:budgetId/print"
            element={<BudgetPrintPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("SSD 480GB")).toBeInTheDocument();
    expect(screen.getByText("Formatação")).toBeInTheDocument();
    expect(screen.getByText("Acompanhamento público")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /acompanhamento público/i })
    ).toBeInTheDocument();
  });
});
