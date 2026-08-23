import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../../../contexts/ToastContext";
import { testApiUrl } from "../../../test/apiUrl";
import { renderWithProviders } from "../../../test/helpers/renderWithProviders";
import { server } from "../../../test/server";
import { PartsPage } from "./PartsPage";

const admin = {
  id: "admin-id",
  name: "Admin",
  login: "admin",
  role: "ADMIN" as const,
  setupCompleted: true,
};

const part = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "SSD 512GB",
  brand: "Kingston",
  currentPrice: "250",
  stock: 3,
  minimumStock: 5,
  stockStatus: "LOW_STOCK" as const,
  supplier: "Distribuidora",
  active: true,
  createdAt: "2026-08-20T10:00:00.000Z",
  updatedAt: "2026-08-20T10:00:00.000Z",
};

function paginatedParts(data = [part]) {
  return {
    data,
    meta: {
      page: 1,
      limit: 20,
      total: data.length,
      totalPages: data.length ? 1 : 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

function renderPage(route = "/parts") {
  renderWithProviders(
    <ToastProvider>
      <PartsPage />
    </ToastProvider>,
    { route, user: admin }
  );
}

describe("PartsPage reliable stock", () => {
  it("shows minimum stock and a textual stock status in desktop and mobile views", async () => {
    server.use(
      http.get(`${testApiUrl}/parts`, () =>
        HttpResponse.json(paginatedParts())
      )
    );

    renderPage();

    expect(await screen.findAllByText("SSD 512GB")).toHaveLength(2);
    expect(screen.getAllByText("Baixo estoque").length).toBeGreaterThan(1);
    expect(screen.getAllByText("5").length).toBeGreaterThan(1);
    expect(screen.getAllByRole("link", { name: /ver/i })).toHaveLength(2);
  });

  it("combines the server-side stock filter with the existing search", async () => {
    const requests: URL[] = [];

    server.use(
      http.get(`${testApiUrl}/parts`, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const matches =
          url.searchParams.get("stockStatus") === "LOW_STOCK" &&
          url.searchParams.get("search") === "ssd";

        return HttpResponse.json(paginatedParts(matches ? [part] : []));
      })
    );

    renderPage();
    await screen.findByText(/nenhuma peça encontrada/i);

    await userEvent.click(
      screen.getByRole("button", { name: "Baixo estoque" })
    );
    await userEvent.type(
      screen.getByPlaceholderText(/buscar por nome/i),
      "ssd"
    );

    expect(await screen.findAllByText("SSD 512GB")).toHaveLength(2);
    await waitFor(() => {
      expect(
        requests.some(
          (url) =>
            url.searchParams.get("stockStatus") === "LOW_STOCK" &&
            url.searchParams.get("search") === "ssd" &&
            url.searchParams.get("page") === "1"
        )
      ).toBe(true);
    });
  });
});
