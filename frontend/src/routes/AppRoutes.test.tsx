import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "./AppRoutes";
import { testApiUrl } from "../test/apiUrl";
import { renderWithProviders } from "../test/helpers/renderWithProviders";
import { server } from "../test/server";
import type { AuthUser } from "../types/auth";

const users: Record<AuthUser["role"], AuthUser> = {
  ADMIN: {
    id: "admin-id",
    name: "Admin",
    login: "admin",
    role: "ADMIN",
    setupCompleted: true,
  },
  RECEPTION: {
    id: "reception-id",
    name: "Recepcao",
    login: "recepcao",
    role: "RECEPTION",
    setupCompleted: true,
  },
  TECHNICIAN: {
    id: "technician-id",
    name: "Técnico",
    login: "tecnico",
    role: "TECHNICIAN",
    setupCompleted: true,
  },
};

function useDashboardHandler() {
  server.use(
    http.get(`${testApiUrl}/dashboard/summary`, () => {
      return HttpResponse.json({
        serviceOrders: {
          open: 1,
          createdToday: 1,
          deliveredToday: 0,
          received: 1,
          inAnalysis: 0,
          awaitingApproval: 0,
          budgetChangedAwaitingApproval: 0,
          budgetApproved: 0,
          inMaintenance: 0,
          finished: 0,
          awaitingPickup: 0,
        },
        budgets: {
          awaitingApproval: 0,
          changedAwaitingApproval: 0,
        },
        stock: {
          outOfStock: 0,
          lowStock: 0,
          lowStockThreshold: 3,
        },
        recentServiceOrders: [],
        recentStockMovements: [],
      });
    })
  );
}

describe("protected and role routes", () => {
  it("redirects unauthenticated users to login", async () => {
    renderWithProviders(<AppRoutes />, { route: "/dashboard" });

    expect(await screen.findByRole("heading", { name: /entrar/i })).toBeInTheDocument();
  });

  it("shows forbidden page when technician opens users", async () => {
    renderWithProviders(<AppRoutes />, {
      route: "/users",
      user: {
        id: "1",
        name: "Técnico",
        login: "tecnico",
        role: "TECHNICIAN",
        setupCompleted: true,
      },
    });

    expect(await screen.findByText(/acesso negado/i)).toBeInTheDocument();
  });

  it.each(["ADMIN", "RECEPTION", "TECHNICIAN"] as const)(
    "loads dashboard as a lazy deep link for %s",
    async (role) => {
      useDashboardHandler();

      renderWithProviders(<AppRoutes />, {
        route: "/dashboard",
        user: users[role],
      });

      expect(
        await screen.findByRole("heading", { name: /dashboard/i })
      ).toBeInTheDocument();
      expect(await screen.findByText(/os abertas/i)).toBeInTheDocument();
    }
  );

  it("loads public tracking without authentication", async () => {
    renderWithProviders(<AppRoutes />, {
      route: "/track/valid-token",
    });

    expect(await screen.findByText(/consulta da os/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /os #142/i })).toBeInTheDocument();
  });

  it("shows the lazy 404 route for unknown authenticated paths", async () => {
    renderWithProviders(<AppRoutes />, {
      route: "/missing-route",
      user: users.ADMIN,
    });

    expect(await screen.findByText(/pagina nao encontrada/i)).toBeInTheDocument();
  });
});
