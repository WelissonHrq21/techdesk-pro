import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../../../contexts/ToastContext";
import { testApiUrl } from "../../../test/apiUrl";
import { renderWithProviders } from "../../../test/helpers/renderWithProviders";
import { server } from "../../../test/server";
import type { AuthUser } from "../../../types/auth";
import type { ServiceOrderStatus } from "../../../types/dashboard";
import type {
  ReverseStockMovementResponse,
  ServiceOrderDetail,
  ServiceOrderStockMovement,
} from "../types/serviceOrder";
import { ServiceOrderDetailPage } from "./ServiceOrderDetailPage";

const serviceOrderId = "11111111-1111-4111-8111-111111111111";
const partId = "22222222-2222-4222-8222-222222222222";
const exitId = "33333333-3333-4333-8333-333333333333";
const reversalId = "44444444-4444-4444-8444-444444444444";
const technicianUser = {
  id: "55555555-5555-4555-8555-555555555555",
  name: "Técnico Piloto",
};

const users: Record<AuthUser["role"], AuthUser> = {
  ADMIN: {
    id: "admin-id",
    name: "Admin",
    login: "admin",
    role: "ADMIN",
    setupCompleted: true,
  },
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

function makeExitMovement(quantity = 2): ServiceOrderStockMovement {
  return {
    id: exitId,
    type: "EXIT",
    quantity,
    reason: "Consumo durante manutenção",
    createdAt: "2026-08-17T10:00:00.000Z",
    partId,
    serviceOrderId,
    userId: technicianUser.id,
    reversalOfMovementId: null,
    part: {
      id: partId,
      name: "SSD 512GB",
      stock: 3,
    },
    user: technicianUser,
  };
}

function makeReversalMovement(
  id = reversalId,
  quantity = 1
): ServiceOrderStockMovement {
  return {
    id,
    type: "REVERSAL",
    quantity,
    reason: "Peça não será utilizada",
    createdAt: "2026-08-17T10:05:00.000Z",
    partId,
    serviceOrderId,
    userId: technicianUser.id,
    reversalOfMovementId: exitId,
    part: {
      id: partId,
      name: "SSD 512GB",
      stock: 4,
    },
    user: technicianUser,
  };
}

function makeReversalResponseMovement(
  id = reversalId,
  quantity = 1
): ReverseStockMovementResponse["movement"] {
  const originalMovement = makeExitMovement();

  return {
    ...makeReversalMovement(id, quantity),
    reversalOfMovement: {
      id: originalMovement.id,
      type: originalMovement.type,
      quantity: originalMovement.quantity,
      partId: originalMovement.partId,
      serviceOrderId: originalMovement.serviceOrderId,
      userId: originalMovement.userId,
      createdAt: originalMovement.createdAt,
    },
  };
}

function makeServiceOrder({
  status = "IN_MAINTENANCE",
  movements = [makeExitMovement()],
}: {
  status?: ServiceOrderStatus;
  movements?: ServiceOrderStockMovement[];
} = {}): ServiceOrderDetail {
  return {
    id: serviceOrderId,
    number: 18,
    publicToken: "66666666-6666-4666-8666-666666666666",
    reportedIssue: "Notebook não liga",
    diagnosis: "SSD com falha",
    password: null,
    status,
    createdAt: "2026-08-17T09:00:00.000Z",
    updatedAt: "2026-08-17T09:30:00.000Z",
    customer: {
      id: "customer-id",
      name: "Cliente Piloto",
      phone: "85999990000",
      email: null,
      zipCode: null,
      address: null,
      active: true,
      createdAt: "2026-08-17T08:00:00.000Z",
      updatedAt: "2026-08-17T08:00:00.000Z",
    },
    equipment: {
      id: "equipment-id",
      type: "Notebook",
      brand: "Dell",
      model: "Latitude",
      serialNumber: "OS-STAGE3",
      active: true,
      createdAt: "2026-08-17T08:00:00.000Z",
      updatedAt: "2026-08-17T08:00:00.000Z",
    },
    accessories: [],
    budgets: [
      {
        id: "budget-id",
        version: 1,
        totalValue: "500",
        createdAt: "2026-08-17T09:10:00.000Z",
        updatedAt: "2026-08-17T09:10:00.000Z",
        serviceOrderId,
        budgetItems: [
          {
            id: "budget-item-id",
            quantity: 2,
            unitPrice: "250",
            part: {
              id: partId,
              name: "SSD 512GB",
              brand: "Kingston",
              currentPrice: "250",
              stock: 3,
            },
          },
        ],
      },
    ],
    serviceOrderHistories: [],
    stockMovements: movements,
  };
}

function renderPage({
  role = "TECHNICIAN",
  serviceOrder = makeServiceOrder(),
  reverseHandler,
}: {
  role?: AuthUser["role"];
  serviceOrder?: ServiceOrderDetail;
  reverseHandler?: Parameters<typeof http.post>[1];
} = {}) {
  let currentServiceOrder = serviceOrder;
  const requests: Array<{ quantity: number; reason: string }> = [];

  server.use(
    http.get(`${testApiUrl}/service-orders/${serviceOrderId}`, () => {
      return HttpResponse.json(currentServiceOrder);
    }),
    http.post(
      `${testApiUrl}/stock-movements/${exitId}/reverse`,
      reverseHandler ??
        (async ({ request }) => {
          const body = (await request.json()) as {
            quantity: number;
            reason: string;
          };
          requests.push(body);

          const movement = makeReversalResponseMovement(
            reversalId,
            body.quantity
          );
          currentServiceOrder = {
            ...currentServiceOrder,
            stockMovements: [...currentServiceOrder.stockMovements, movement],
          };

          return HttpResponse.json(
            {
              part: {
                id: partId,
                name: "SSD 512GB",
                brand: "Kingston",
                currentPrice: "250",
                stock: 4,
                supplier: null,
                active: true,
                createdAt: "2026-08-17T08:00:00.000Z",
                updatedAt: "2026-08-17T10:06:00.000Z",
              },
              movement,
              originalMovement: makeExitMovement(),
              reversedQuantity: body.quantity,
              reversibleQuantity: 2 - body.quantity,
            } satisfies ReverseStockMovementResponse,
            { status: 201 }
          );
        })
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
    requests,
    getServiceOrder: () => currentServiceOrder,
    setServiceOrder: (nextServiceOrder: ServiceOrderDetail) => {
      currentServiceOrder = nextServiceOrder;
    },
  };
}

async function waitForServiceOrder() {
  expect(
    await screen.findByRole("heading", { name: /os #18/i })
  ).toBeInTheDocument();
}

describe("ServiceOrderDetailPage stock reversal", () => {
  it("shows reversal action for ADMIN with IN_MAINTENANCE and reversible balance", async () => {
    renderPage({ role: "ADMIN" });
    await waitForServiceOrder();

    expect(
      screen.getByRole("button", { name: /^estornar$/i })
    ).toBeInTheDocument();
  });

  it("shows reversal action for TECHNICIAN with IN_MAINTENANCE", async () => {
    renderPage({ role: "TECHNICIAN" });
    await waitForServiceOrder();

    expect(
      screen.getByRole("button", { name: /^estornar$/i })
    ).toBeInTheDocument();
  });

  it("does not show reversal action for RECEPTION", async () => {
    renderPage({ role: "RECEPTION" });
    await waitForServiceOrder();

    expect(
      screen.queryByRole("button", { name: /^estornar$/i })
    ).not.toBeInTheDocument();
  });

  it("shows reversal action for TECHNICIAN with FINISHED", async () => {
    renderPage({
      role: "TECHNICIAN",
      serviceOrder: makeServiceOrder({ status: "FINISHED" }),
    });
    await waitForServiceOrder();

    expect(
      screen.getByRole("button", { name: /^estornar$/i })
    ).toBeInTheDocument();
  });

  it("does not show reversal action for DELIVERED", async () => {
    renderPage({
      role: "TECHNICIAN",
      serviceOrder: makeServiceOrder({ status: "DELIVERED" }),
    });
    await waitForServiceOrder();

    expect(
      screen.queryByRole("button", { name: /^estornar$/i })
    ).not.toBeInTheDocument();
  });

  it("does not show reversal action when reversible balance is zero", async () => {
    renderPage({
      serviceOrder: makeServiceOrder({
        movements: [
          makeExitMovement(2),
          makeReversalMovement("reversal-1", 1),
          makeReversalMovement("reversal-2", 1),
        ],
      }),
    });
    await waitForServiceOrder();

    expect(screen.getByText("Saldo reversível")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^estornar$/i })
    ).not.toBeInTheDocument();
  });

  it("opens modal with original, reversed and available quantities", async () => {
    renderPage({
      serviceOrder: makeServiceOrder({
        movements: [makeExitMovement(2), makeReversalMovement()],
      }),
    });
    await waitForServiceOrder();

    await userEvent.click(screen.getByRole("button", { name: /^estornar$/i }));

    const dialog = screen.getByRole("dialog", { name: /estornar consumo/i });
    expect(within(dialog).getByText("Consumido")).toBeInTheDocument();
    expect(within(dialog).getByText("Estornado")).toBeInTheDocument();
    expect(within(dialog).getByText("Consumo líquido")).toBeInTheDocument();
    expect(within(dialog).getByText("Disponível")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("1")).toBeInTheDocument();
  });

  it("blocks quantity above reversible balance before sending", async () => {
    const { requests } = renderPage({
      serviceOrder: makeServiceOrder({
        movements: [makeExitMovement(2), makeReversalMovement()],
      }),
    });
    await waitForServiceOrder();

    await userEvent.click(screen.getByRole("button", { name: /^estornar$/i }));
    await userEvent.clear(screen.getByLabelText(/quantidade a estornar/i));
    await userEvent.type(screen.getByLabelText(/quantidade a estornar/i), "2");
    await userEvent.type(screen.getByLabelText(/motivo/i), "Tentativa inválida");
    await userEvent.click(
      screen.getByRole("button", { name: /confirmar estorno/i })
    );

    expect(
      await screen.findByText(/quantidade máxima para estorno é 1/i)
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it("does not send when reason is empty", async () => {
    const { requests } = renderPage();
    await waitForServiceOrder();

    await userEvent.click(screen.getByRole("button", { name: /^estornar$/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /confirmar estorno/i })
    );

    expect(
      await screen.findByText(/informe o motivo do estorno/i)
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it("submits partial reversal, closes modal and refreshes UI", async () => {
    const { requests } = renderPage();
    await waitForServiceOrder();

    await userEvent.click(screen.getByRole("button", { name: /^estornar$/i }));
    await userEvent.type(screen.getByLabelText(/motivo/i), "Peça retirada");
    await userEvent.click(
      screen.getByRole("button", { name: /confirmar estorno/i })
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /estornar consumo/i })
      ).not.toBeInTheDocument();
    });

    expect(requests).toEqual([{ quantity: 1, reason: "Peça retirada" }]);
    expect(
      await screen.findByText("1 unidade estornada com sucesso.")
    ).toBeInTheDocument();
    expect(await screen.findByText("Estorno")).toBeInTheDocument();
    expect(screen.getAllByText("+1").length).toBeGreaterThan(0);
  });

  it("hides reversal action after full reversal", async () => {
    renderPage({
      reverseHandler: () => {
        const movementB = makeReversalResponseMovement("reversal-b", 1);

        return HttpResponse.json(
          {
            part: {
              id: partId,
              name: "SSD 512GB",
              brand: "Kingston",
              currentPrice: "250",
              stock: 5,
              supplier: null,
              active: true,
              createdAt: "2026-08-17T08:00:00.000Z",
              updatedAt: "2026-08-17T10:06:00.000Z",
            },
            movement: movementB,
            originalMovement: makeExitMovement(),
            reversedQuantity: 2,
            reversibleQuantity: 0,
          } satisfies ReverseStockMovementResponse,
          { status: 201 }
        );
      },
    });
    await waitForServiceOrder();

    server.use(
      http.get(`${testApiUrl}/service-orders/${serviceOrderId}`, () => {
        return HttpResponse.json(
          makeServiceOrder({
            movements: [
              makeExitMovement(2),
              makeReversalMovement("reversal-a", 1),
              makeReversalMovement("reversal-b", 1),
            ],
          })
        );
      })
    );

    await userEvent.click(screen.getByRole("button", { name: /^estornar$/i }));
    await userEvent.type(screen.getByLabelText(/motivo/i), "Estorno final");
    await userEvent.click(
      screen.getByRole("button", { name: /confirmar estorno/i })
    );

    expect(
      await screen.findByText("Consumo estornado com sucesso.")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /^estornar$/i })
      ).not.toBeInTheDocument();
    });
  });

  it("shows friendly 409 message and refetches stale data", async () => {
    const { setServiceOrder } = renderPage({
      reverseHandler: () => {
        setServiceOrder(
          makeServiceOrder({
            movements: [
              makeExitMovement(1),
              makeReversalMovement("external-reversal", 1),
            ],
          })
        );

        return HttpResponse.json(
          {
            message:
              "Reversal quantity exceeds available reversible quantity",
          },
          { status: 409 }
        );
      },
    });
    await waitForServiceOrder();

    await userEvent.click(screen.getByRole("button", { name: /^estornar$/i }));
    await userEvent.type(screen.getByLabelText(/motivo/i), "Outra aba");
    await userEvent.click(
      screen.getByRole("button", { name: /confirmar estorno/i })
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(/já foi estornado total ou parcialmente/i).length
      ).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getAllByText("+1").length).toBeGreaterThan(0);
    });
  });

  it("shows friendly 403 message and keeps the session rendered", async () => {
    renderPage({
      reverseHandler: () => {
        return HttpResponse.json({ message: "Forbidden" }, { status: 403 });
      },
    });
    await waitForServiceOrder();

    await userEvent.click(screen.getByRole("button", { name: /^estornar$/i }));
    await userEvent.type(screen.getByLabelText(/motivo/i), "Sem permissão");
    await userEvent.click(
      screen.getByRole("button", { name: /confirmar estorno/i })
    );

    expect(await screen.findByText(/permiss/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /os #18/i })
    ).toBeInTheDocument();
  });

  it("renders REVERSAL visually distinct from EXIT", async () => {
    renderPage({
      serviceOrder: makeServiceOrder({
        movements: [makeExitMovement(2), makeReversalMovement()],
      }),
    });
    await waitForServiceOrder();

    expect(screen.getByText("Saída")).toBeInTheDocument();
    expect(screen.getByText("Estorno")).toBeInTheDocument();
    expect(screen.getByText("-2")).toBeInTheDocument();
    expect(screen.getAllByText("+1").length).toBeGreaterThan(0);
  });
});
