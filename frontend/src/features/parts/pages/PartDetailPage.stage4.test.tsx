import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../../../contexts/ToastContext";
import { testApiUrl } from "../../../test/apiUrl";
import { renderWithProviders } from "../../../test/helpers/renderWithProviders";
import { server } from "../../../test/server";
import type { Part, StockMovement } from "../types/part";
import { PartDetailPage } from "./PartDetailPage";

const partId = "11111111-1111-4111-8111-111111111111";
const admin = {
  id: "admin-id",
  name: "Admin",
  login: "admin",
  role: "ADMIN" as const,
  setupCompleted: true,
};

function makePart(overrides: Partial<Part> = {}): Part {
  return {
    id: partId,
    name: "SSD 512GB",
    brand: "Kingston",
    currentPrice: "250",
    stock: 4,
    minimumStock: 5,
    stockStatus: "LOW_STOCK",
    supplier: null,
    active: true,
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
    ...overrides,
  };
}

function makeMovement(id: string, type: StockMovement["type"]): StockMovement {
  return {
    id,
    type,
    quantity: 1,
    reason: `${type} teste`,
    createdAt: "2026-08-21T12:00:00.000Z",
    reversalOfMovementId: null,
    user: { id: admin.id, name: admin.name, login: admin.login, role: admin.role },
    serviceOrder: null,
  };
}

function movementResponse(
  page: number,
  data: StockMovement[] = [makeMovement(`movement-${page}`, "ENTRY")]
) {
  return {
    data,
    meta: {
      page,
      limit: 20,
      total: 21,
      totalPages: 2,
      hasNextPage: page < 2,
      hasPreviousPage: page > 1,
    },
  };
}

function renderPage() {
  renderWithProviders(
    <ToastProvider>
      <Routes>
        <Route path="/parts/:id" element={<PartDetailPage />} />
      </Routes>
    </ToastProvider>,
    { route: `/parts/${partId}`, user: admin }
  );
}

describe("PartDetailPage reliable stock", () => {
  it("paginates and filters history by type and inclusive date parameters", async () => {
    const requests: URL[] = [];

    server.use(
      http.get(`${testApiUrl}/parts/${partId}`, () =>
        HttpResponse.json(makePart())
      ),
      http.get(`${testApiUrl}/parts/${partId}/stock-movements`, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = Number(url.searchParams.get("page") ?? "1");
        const type = url.searchParams.get("type") as StockMovement["type"] | null;
        return HttpResponse.json(
          movementResponse(page, [makeMovement(`movement-${page}`, type ?? "ENTRY")])
        );
      })
    );

    renderPage();
    expect(await screen.findByText("Pagina 1 de 2")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Proxima" }));
    expect(await screen.findByText("Pagina 2 de 2")).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText(/filtrar movimentos por tipo/i),
      "REVERSAL"
    );
    await userEvent.type(screen.getByLabelText(/data inicial/i), "2026-08-01");
    await userEvent.type(screen.getByLabelText(/data final/i), "2026-08-21");

    await waitFor(() => {
      expect(
        requests.some(
          (url) =>
            url.searchParams.get("page") === "1" &&
            url.searchParams.get("limit") === "20" &&
            url.searchParams.get("type") === "REVERSAL" &&
            url.searchParams.get("dateFrom") === "2026-08-01" &&
            url.searchParams.get("dateTo") === "2026-08-21"
        )
      ).toBe(true);
    });
  });

  it("invalidates part and history after an entry", async () => {
    let partRequests = 0;
    let movementRequests = 0;

    server.use(
      http.get(`${testApiUrl}/parts/${partId}`, () => {
        partRequests += 1;
        return HttpResponse.json(makePart({ stock: partRequests > 1 ? 6 : 4 }));
      }),
      http.get(`${testApiUrl}/parts/${partId}/stock-movements`, () => {
        movementRequests += 1;
        return HttpResponse.json(movementResponse(1));
      }),
      http.post(`${testApiUrl}/parts/${partId}/stock/entry`, () =>
        HttpResponse.json({}, { status: 201 })
      )
    );

    renderPage();
    await screen.findByRole("heading", { name: "SSD 512GB" });
    await userEvent.click(screen.getByRole("button", { name: "Entrada" }));
    const dialog = screen.getByRole("dialog", { name: /entrada de estoque/i });
    await userEvent.click(within(dialog).getByRole("button", { name: "Registrar" }));

    await waitFor(() => {
      expect(partRequests).toBeGreaterThan(1);
      expect(movementRequests).toBeGreaterThan(1);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("invalidates part and history after a successful manual exit", async () => {
    let partRequests = 0;
    let movementRequests = 0;

    server.use(
      http.get(`${testApiUrl}/parts/${partId}`, () => {
        partRequests += 1;
        return HttpResponse.json(makePart({ stock: partRequests > 1 ? 3 : 4 }));
      }),
      http.get(`${testApiUrl}/parts/${partId}/stock-movements`, () => {
        movementRequests += 1;
        return HttpResponse.json(movementResponse(1));
      }),
      http.get(`${testApiUrl}/service-orders`, () =>
        HttpResponse.json({
          data: [],
          meta: {
            page: 1,
            limit: 8,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        })
      ),
      http.post(`${testApiUrl}/parts/${partId}/stock/exit`, () =>
        HttpResponse.json({}, { status: 201 })
      )
    );

    renderPage();
    await screen.findByRole("heading", { name: "SSD 512GB" });
    await userEvent.click(screen.getByRole("button", { name: /saída manual/i }));
    const dialog = screen.getByRole("dialog", { name: /saída manual/i });
    await userEvent.click(within(dialog).getByRole("button", { name: "Registrar" }));

    await waitFor(() => {
      expect(partRequests).toBeGreaterThan(1);
      expect(movementRequests).toBeGreaterThan(1);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("handles a stale-stock 409, refreshes the balance and preserves the session", async () => {
    let currentPart = makePart({ stock: 1, minimumStock: 0, stockStatus: "OK" });
    let partRequests = 0;
    let movementRequests = 0;

    server.use(
      http.get(`${testApiUrl}/parts/${partId}`, () => {
        partRequests += 1;
        return HttpResponse.json(currentPart);
      }),
      http.get(`${testApiUrl}/parts/${partId}/stock-movements`, () => {
        movementRequests += 1;
        return HttpResponse.json(movementResponse(1));
      }),
      http.get(`${testApiUrl}/service-orders`, () =>
        HttpResponse.json({
          data: [],
          meta: {
            page: 1,
            limit: 8,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        })
      ),
      http.post(`${testApiUrl}/parts/${partId}/stock/exit`, () => {
        currentPart = makePart({
          stock: 0,
          minimumStock: 0,
          stockStatus: "OUT_OF_STOCK",
        });
        return HttpResponse.json({ message: "Insufficient stock" }, { status: 409 });
      })
    );

    renderPage();
    await screen.findByRole("heading", { name: "SSD 512GB" });
    await userEvent.click(screen.getByRole("button", { name: /saída manual/i }));
    const dialog = screen.getByRole("dialog", { name: /saída manual/i });
    await userEvent.click(within(dialog).getByRole("button", { name: "Registrar" }));

    expect(
      await within(dialog).findByText(/estoque insuficiente.*saldo foi atualizado/i)
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(partRequests).toBeGreaterThan(1);
      expect(movementRequests).toBeGreaterThan(1);
      expect(screen.getAllByText("Sem estoque").length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("heading", { name: "SSD 512GB" })).toBeInTheDocument();
  });

  it("edits minimum stock without sending a stock quantity", async () => {
    const bodies: unknown[] = [];

    server.use(
      http.get(`${testApiUrl}/parts/${partId}`, () =>
        HttpResponse.json(makePart())
      ),
      http.get(`${testApiUrl}/parts/${partId}/stock-movements`, () =>
        HttpResponse.json(movementResponse(1))
      ),
      http.put(`${testApiUrl}/parts/${partId}`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(makePart({ minimumStock: 7 }));
      })
    );

    renderPage();
    await screen.findByRole("heading", { name: "SSD 512GB" });
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const minimumInput = screen.getByLabelText(/estoque mínimo/i);
    await userEvent.clear(minimumInput);
    await userEvent.type(minimumInput, "7");
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ minimumStock: 7 });
    expect(bodies[0]).not.toHaveProperty("stock");
  });
});
