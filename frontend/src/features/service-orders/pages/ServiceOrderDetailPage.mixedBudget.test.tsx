import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../../../contexts/ToastContext";
import { testApiUrl } from "../../../test/apiUrl";
import { renderWithProviders } from "../../../test/helpers/renderWithProviders";
import { server } from "../../../test/server";
import type { AuthUser } from "../../../types/auth";
import type { ServiceOrderStatus } from "../../../types/dashboard";
import type {
  BudgetItem,
  BudgetSummary,
  ServiceOrderDetail,
} from "../types/serviceOrder";
import { ServiceOrderDetailPage } from "./ServiceOrderDetailPage";

const serviceOrderId = "11111111-1111-4111-8111-111111111111";
const partId = "22222222-2222-4222-8222-222222222222";

const users: Record<"TECHNICIAN" | "RECEPTION", AuthUser> = {
  TECHNICIAN: {
    id: "technician-id",
    name: "Técnico",
    login: "tecnico",
    role: "TECHNICIAN",
    setupCompleted: true,
  },
  RECEPTION: {
    id: "reception-id",
    name: "Recepção",
    login: "recepcao",
    role: "RECEPTION",
    setupCompleted: true,
  },
};

const partItem: BudgetItem = {
  id: "part-item",
  type: "PART",
  description: "Snapshot SSD 480GB",
  partId,
  quantity: 2,
  unitPrice: "250",
  part: {
    id: partId,
    name: "Renamed SSD",
    brand: "Kingston",
    currentPrice: "300",
    stock: 5,
  },
};

const serviceItem: BudgetItem = {
  id: "service-item",
  type: "SERVICE",
  description: "Formatação",
  partId: null,
  quantity: 1,
  unitPrice: "100",
  part: null,
};

function makeBudget(
  version = 1,
  items: BudgetItem[] = [partItem, serviceItem]
): BudgetSummary {
  return {
    id: `budget-${version}`,
    version,
    totalValue: String(
      items.reduce(
        (total, item) => total + item.quantity * Number(item.unitPrice),
        0
      )
    ),
    createdAt: `2026-08-23T10:0${version}:00.000Z`,
    updatedAt: `2026-08-23T10:0${version}:00.000Z`,
    serviceOrderId,
    budgetItems: items,
  };
}

function makeServiceOrder({
  status = "IN_MAINTENANCE",
  budgets = [makeBudget()],
}: {
  status?: ServiceOrderStatus;
  budgets?: BudgetSummary[];
} = {}): ServiceOrderDetail {
  return {
    id: serviceOrderId,
    number: 24,
    publicToken: "33333333-3333-4333-8333-333333333333",
    reportedIssue: "Notebook lento",
    diagnosis: "SSD e manutenção preventiva",
    password: null,
    status,
    createdAt: "2026-08-23T09:00:00.000Z",
    updatedAt: "2026-08-23T09:30:00.000Z",
    customer: {
      id: "customer-id",
      name: "Cliente Stage 3",
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
      serialNumber: "STAGE3",
      active: true,
      createdAt: "2026-08-23T08:00:00.000Z",
      updatedAt: "2026-08-23T08:00:00.000Z",
    },
    accessories: [],
    budgets,
    serviceOrderHistories: [],
    stockMovements: [],
  };
}

function renderPage({
  role = "TECHNICIAN",
  serviceOrder = makeServiceOrder(),
  revisionHandler,
  approveHandler,
  rejectHandler,
}: {
  role?: "TECHNICIAN" | "RECEPTION";
  serviceOrder?: ServiceOrderDetail;
  revisionHandler?: Parameters<typeof http.post>[1];
  approveHandler?: Parameters<typeof http.post>[1];
  rejectHandler?: Parameters<typeof http.post>[1];
} = {}) {
  let currentServiceOrder = serviceOrder;
  let getCount = 0;

  server.use(
    http.get(`${testApiUrl}/service-orders/${serviceOrderId}`, () => {
      getCount += 1;
      return HttpResponse.json(currentServiceOrder);
    }),
    http.post(
      `${testApiUrl}/service-orders/${serviceOrderId}/budgets/revision`,
      revisionHandler ?? (() => HttpResponse.json(makeBudget(2), { status: 201 }))
    ),
    http.post(
      `${testApiUrl}/budgets/:budgetId/approve`,
      approveHandler ??
        (() =>
          HttpResponse.json({
            ...currentServiceOrder,
            status: "BUDGET_APPROVED",
          }))
    ),
    http.post(
      `${testApiUrl}/budgets/:budgetId/reject`,
      rejectHandler ??
        (() =>
          HttpResponse.json({
            ...currentServiceOrder,
            status: "BUDGET_REJECTED",
          }))
    )
  );

  renderWithProviders(
    <ToastProvider>
      <Routes>
        <Route
          path="/service-orders/:id"
          element={<ServiceOrderDetailPage />}
        />
      </Routes>
    </ToastProvider>,
    {
      route: `/service-orders/${serviceOrderId}`,
      user: users[role],
    }
  );

  return {
    getCount: () => getCount,
    setServiceOrder: (next: ServiceOrderDetail) => {
      currentServiceOrder = next;
    },
  };
}

async function waitForPage() {
  expect(
    await screen.findByRole("heading", { name: /os #24/i })
  ).toBeInTheDocument();
}

describe("ServiceOrderDetailPage mixed budget flows", () => {
  it("loads PART and SERVICE into revision and serializes both types", async () => {
    const user = userEvent.setup();
    let submittedBody: unknown;
    renderPage({
      revisionHandler: async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json(makeBudget(2), { status: 201 });
      },
    });
    await waitForPage();

    await user.click(
      screen.getByRole("button", { name: /revisar orçamento/i })
    );
    const dialog = screen.getByRole("dialog", { name: /revisar orçamento/i });
    expect(within(dialog).getByDisplayValue("Formatação")).toBeInTheDocument();
    expect(within(dialog).getByText("Snapshot SSD 480GB")).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: /criar revisão/i })
    );

    await waitFor(() => {
      expect(submittedBody).toEqual({
        items: [
          {
            type: "PART",
            partId,
            quantity: 2,
            unitPrice: 250,
          },
          {
            type: "SERVICE",
            description: "Formatação",
            quantity: 1,
            unitPrice: 100,
          },
        ],
      });
    });
  });

  it("handles stale revision 409, refetches, and preserves the session", async () => {
    const user = userEvent.setup();
    const staleOrder = makeServiceOrder();
    let controls: ReturnType<typeof renderPage>;
    controls = renderPage({
      serviceOrder: staleOrder,
      revisionHandler: () => {
        controls.setServiceOrder(
          makeServiceOrder({ budgets: [makeBudget(1), makeBudget(2)] })
        );
        return HttpResponse.json(
          { message: "Budget version conflict. Reload the service order and try again" },
          { status: 409 }
        );
      },
    });
    await waitForPage();
    const initialGetCount = controls.getCount();

    await user.click(
      screen.getByRole("button", { name: /revisar orçamento/i })
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: /revisar orçamento/i })
      ).getByRole("button", { name: /criar revisão/i })
    );

    expect(
      await screen.findByText(/alterado em outra sessão/i)
    ).toBeInTheDocument();
    await waitFor(() => expect(controls.getCount()).toBeGreaterThan(initialGetCount));
    expect(await screen.findByText("Orçamento V2")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /os #24/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: /revisar orçamento/i })
    ).not.toBeInTheDocument();
  });

  it("approves a mixed budget without assuming every item is a Part", async () => {
    const user = userEvent.setup();
    let approved = false;
    renderPage({
      role: "RECEPTION",
      serviceOrder: makeServiceOrder({ status: "AWAITING_APPROVAL" }),
      approveHandler: () => {
        approved = true;
        return HttpResponse.json({ status: "BUDGET_APPROVED" });
      },
    });
    await waitForPage();

    await user.click(
      screen.getByRole("button", { name: /aprovar orçamento/i })
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: /registrar aprovação/i })
      ).getByRole("button", { name: /registrar aprovação/i })
    );

    await waitFor(() => expect(approved).toBe(true));
    expect(await screen.findByText("Orçamento aprovado.")).toBeInTheDocument();
  });

  it("approves a SERVICE-only budget", async () => {
    const user = userEvent.setup();
    let approved = false;
    renderPage({
      role: "RECEPTION",
      serviceOrder: makeServiceOrder({
        status: "AWAITING_APPROVAL",
        budgets: [makeBudget(1, [serviceItem])],
      }),
      approveHandler: () => {
        approved = true;
        return HttpResponse.json({ status: "BUDGET_APPROVED" });
      },
    });
    await waitForPage();

    await user.click(
      screen.getByRole("button", { name: /aprovar orçamento/i })
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: /registrar aprovação/i })
      ).getByRole("button", { name: /registrar aprovação/i })
    );

    await waitFor(() => expect(approved).toBe(true));
    expect(await screen.findByText("Orçamento aprovado.")).toBeInTheDocument();
  });

  it("rejects a mixed budget", async () => {
    const user = userEvent.setup();
    let rejected = false;
    renderPage({
      role: "RECEPTION",
      serviceOrder: makeServiceOrder({
        status: "AWAITING_APPROVAL",
      }),
      rejectHandler: () => {
        rejected = true;
        return HttpResponse.json({ status: "BUDGET_REJECTED" });
      },
    });
    await waitForPage();

    await user.click(
      screen.getByRole("button", { name: /rejeitar orçamento/i })
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: /registrar rejeição/i })
      ).getByRole("button", { name: /registrar rejeição/i })
    );

    await waitFor(() => expect(rejected).toBe(true));
    expect(await screen.findByText("Orçamento rejeitado.")).toBeInTheDocument();
  });

  it("handles a stale approval 409, refetches and preserves the session", async () => {
    const user = userEvent.setup();
    let controls: ReturnType<typeof renderPage>;
    controls = renderPage({
      role: "RECEPTION",
      serviceOrder: makeServiceOrder({ status: "AWAITING_APPROVAL" }),
      approveHandler: () => {
        controls.setServiceOrder(
          makeServiceOrder({ status: "BUDGET_REJECTED" })
        );
        return HttpResponse.json(
          {
            message:
              "Budget decision conflict. Reload the service order and try again",
          },
          { status: 409 }
        );
      },
    });
    await waitForPage();
    const initialGetCount = controls.getCount();

    await user.click(
      screen.getByRole("button", { name: /aprovar orçamento/i })
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: /registrar aprovação/i })
      ).getByRole("button", { name: /registrar aprovação/i })
    );

    expect(
      await screen.findByText(/já recebeu uma decisão em outra sessão/i)
    ).toBeInTheDocument();
    await waitFor(() => expect(controls.getCount()).toBeGreaterThan(initialGetCount));
    expect(
      screen.getByRole("heading", { name: /os #24/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: /registrar aprovação/i })
    ).not.toBeInTheDocument();
  });

  it("handles a stale rejection 409 and reloads the approved state", async () => {
    const user = userEvent.setup();
    let controls: ReturnType<typeof renderPage>;
    controls = renderPage({
      role: "RECEPTION",
      serviceOrder: makeServiceOrder({ status: "AWAITING_APPROVAL" }),
      rejectHandler: () => {
        controls.setServiceOrder(
          makeServiceOrder({ status: "BUDGET_APPROVED" })
        );
        return HttpResponse.json(
          {
            message:
              "Budget decision conflict. Reload the service order and try again",
          },
          { status: 409 }
        );
      },
    });
    await waitForPage();
    const initialGetCount = controls.getCount();

    await user.click(
      screen.getByRole("button", { name: /rejeitar orçamento/i })
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: /registrar rejeição/i })
      ).getByRole("button", { name: /registrar rejeição/i })
    );

    expect(
      await screen.findByText(/já recebeu uma decisão em outra sessão/i)
    ).toBeInTheDocument();
    await waitFor(() => expect(controls.getCount()).toBeGreaterThan(initialGetCount));
    expect(
      screen.getByRole("heading", { name: /os #24/i })
    ).toBeInTheDocument();
  });
});
