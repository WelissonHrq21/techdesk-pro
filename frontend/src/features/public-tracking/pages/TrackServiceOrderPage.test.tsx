import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../../routes/AppRoutes";
import { testApiUrl } from "../../../test/apiUrl";
import { renderWithProviders } from "../../../test/helpers/renderWithProviders";
import { server } from "../../../test/server";

describe("TrackServiceOrderPage", () => {
  it(
    "renders public service order without authentication",
    async () => {
      renderWithProviders(<AppRoutes />, {
        route: "/track/valid-token",
      });

      expect(
        await screen.findByRole(
          "heading",
          { name: /OS #142/i },
          { timeout: 8_000 }
        )
      ).toBeInTheDocument();
      expect(screen.getByText(/Em manutenção/i)).toBeInTheDocument();
      expect(screen.getByText(/Notebook Acer Nitro 5/i)).toBeInTheDocument();
      expect(screen.queryByText(/cpf|cnpj|diagnóstico|senha|estoque/i))
        .not.toBeInTheDocument();
    },
    10_000
  );

  it("renders safe not found message for invalid token", async () => {
    renderWithProviders(<AppRoutes />, {
      route: "/track/invalid-token",
    });

    expect(
      await screen.findByText(/não foi possível localizar/i)
    ).toBeInTheDocument();
  });

  it.each([
    ["CANCELLED", "Cancelado"],
    ["DELIVERED", "Entregue"],
  ])("keeps public tracking available for %s orders", async (status, label) => {
    server.use(
      http.get(`${testApiUrl}/public/service-orders/status-token`, () =>
        HttpResponse.json({
          number: 143,
          status,
          createdAt: "2026-08-11T10:00:00.000Z",
          updatedAt: "2026-08-11T12:00:00.000Z",
          equipment: {
            type: "Notebook",
            brand: "Acer",
            model: "Nitro 5",
          },
        })
      )
    );

    renderWithProviders(<AppRoutes />, {
      route: "/track/status-token",
    });

    expect(await screen.findByText(label, {}, { timeout: 5_000 }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /os #143/i }))
      .toBeInTheDocument();
  });
});
