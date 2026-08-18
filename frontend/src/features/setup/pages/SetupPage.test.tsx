import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../../routes/AppRoutes";
import { testApiUrl } from "../../../test/apiUrl";
import { renderWithProviders } from "../../../test/helpers/renderWithProviders";
import { server } from "../../../test/server";
import type { AuthUser } from "../../../types/auth";
import type { CompanySettings } from "../../settings/types/companySettings";
import { SetupPage } from "./SetupPage";

const adminUser: AuthUser = {
  id: "admin-id",
  name: "Admin",
  login: "admin",
  role: "ADMIN",
  setupCompleted: false,
};

const completedAdmin: AuthUser = {
  ...adminUser,
  setupCompleted: true,
};

function setupStatusResponse(overrides = {}) {
  return {
    setupCompleted: false,
    setupCompletedAt: null,
    companySettings: null,
    initialUsers: [],
    ...overrides,
  };
}

describe("SetupPage", () => {
  it("redirects incomplete admins from normal private routes to setup", async () => {
    server.use(
      http.get(`${testApiUrl}/setup/status`, () => {
        return HttpResponse.json(setupStatusResponse());
      })
    );

    renderWithProviders(<AppRoutes />, {
      route: "/dashboard",
      user: adminUser,
    });

    expect(
      await screen.findByRole("heading", { name: /configuração inicial/i })
    ).toBeInTheDocument();
  });

  it("blocks non-admin users from the first-run setup", async () => {
    renderWithProviders(<AppRoutes />, {
      route: "/setup",
      user: {
        id: "tech-id",
        name: "Tecnico",
        login: "tecnico",
        role: "TECHNICIAN",
        setupCompleted: false,
      },
    });

    expect(await screen.findByText(/acesso negado/i)).toBeInTheDocument();
  });

  it("blocks reception users from the first-run setup", async () => {
    renderWithProviders(<AppRoutes />, {
      route: "/setup",
      user: {
        id: "reception-id",
        name: "Recepcao",
        login: "recepcao",
        role: "RECEPTION",
        setupCompleted: false,
      },
    });

    expect(await screen.findByText(/acesso negado/i)).toBeInTheDocument();
  });

  it("redirects completed admins away from setup", async () => {
    server.use(
      http.get(`${testApiUrl}/dashboard/summary`, () => {
        return HttpResponse.json({
          cards: {
            openServiceOrders: 0,
            awaitingApproval: 0,
            inMaintenance: 0,
            lowStockParts: 0,
          },
          recentServiceOrders: [],
          recentStockMovements: [],
        });
      })
    );

    renderWithProviders(<AppRoutes />, {
      route: "/setup",
      user: completedAdmin,
    });

    expect(await screen.findByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
  });

  it("shows setup API errors without leaving the wizard", async () => {
    server.use(
      http.get(`${testApiUrl}/setup/status`, () => {
        return HttpResponse.json(
          { message: "Setup unavailable" },
          { status: 500 }
        );
      })
    );

    renderWithProviders(<SetupPage />, {
      route: "/setup",
      user: adminUser,
    });

    expect(
      await screen.findByText(/não foi possível carregar a configuração inicial/i)
    ).toBeInTheDocument();
  });

  it("saves company data, creates initial users and completes setup", async () => {
    const createdUsers: Array<{
      id: string;
      name: string;
      login: string;
      role: "RECEPTION" | "TECHNICIAN";
      active: boolean;
      createdAt: string;
      updatedAt: string;
    }> = [];
    let companySettings: CompanySettings | null = null;
    let completed = false;
    const requests: unknown[] = [];

    server.use(
      http.get(`${testApiUrl}/setup/status`, () => {
        return HttpResponse.json(
          setupStatusResponse({
            setupCompleted: completed,
            setupCompletedAt: completed ? "2026-08-18T00:00:00.000Z" : null,
            companySettings,
            initialUsers: createdUsers,
          })
        );
      }),
      http.patch(`${testApiUrl}/setup/company`, async ({ request }) => {
        requests.push(await request.json());
        companySettings = {
          id: "company-id",
          name: "Assistencia Piloto",
          document: null,
          phone: "82999990000",
          email: null,
          address: null,
          zipCode: null,
          setupCompleted: false,
          setupCompletedAt: null,
          createdAt: "2026-08-18T00:00:00.000Z",
          updatedAt: "2026-08-18T00:00:00.000Z",
        };

        return HttpResponse.json(companySettings);
      }),
      http.patch(`${testApiUrl}/setup/admin`, async ({ request }) => {
        requests.push(await request.json());

        return HttpResponse.json({
          id: adminUser.id,
          name: "Admin Piloto",
          login: "admin",
          role: "ADMIN",
          active: true,
          createdAt: "2026-08-18T00:00:00.000Z",
          updatedAt: "2026-08-18T00:00:00.000Z",
        });
      }),
      http.post(`${testApiUrl}/setup/users`, async ({ request }) => {
        const body = (await request.json()) as {
          name: string;
          login: string;
          role: "RECEPTION" | "TECHNICIAN";
        };
        requests.push(body);
        const createdUser = {
          id: `user-${createdUsers.length + 1}`,
          name: body.name,
          login: body.login,
          role: body.role,
          active: true,
          createdAt: "2026-08-18T00:00:00.000Z",
          updatedAt: "2026-08-18T00:00:00.000Z",
        };
        createdUsers.push(createdUser);

        return HttpResponse.json(createdUser, { status: 201 });
      }),
      http.post(`${testApiUrl}/setup/complete`, async ({ request }) => {
        requests.push(await request.json());
        completed = true;

        return HttpResponse.json({
          setupCompleted: true,
          setupCompletedAt: "2026-08-18T00:00:00.000Z",
        });
      })
    );

    renderWithProviders(<SetupPage />, {
      route: "/setup",
      user: adminUser,
    });

    await userEvent.click(await screen.findByRole("button", { name: /começar configuração/i }));
    await userEvent.type(screen.getByLabelText(/nome da assistência/i), "Assistencia Piloto");
    await userEvent.type(screen.getByLabelText(/telefone/i), "82999990000");
    await userEvent.click(screen.getByRole("button", { name: /salvar empresa/i }));

    await screen.findByRole("heading", { name: /administrador/i });
    await userEvent.clear(screen.getByLabelText(/nome \*/i));
    await userEvent.type(screen.getByLabelText(/nome \*/i), "Admin Piloto");
    await userEvent.click(screen.getByRole("button", { name: /salvar administrador/i }));

    await screen.findByRole("heading", { name: /usuários iniciais/i });
    await userEvent.type(screen.getByLabelText(/nome/i), "Recepcao Piloto");
    await userEvent.type(screen.getByLabelText(/login/i), "recepcao");
    await userEvent.type(screen.getByLabelText(/senha/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /adicionar usuário/i }));

    expect(await screen.findByText("Recepcao Piloto")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /continuar/i }));
    await userEvent.click(screen.getByLabelText(/backups devem ser configurados/i));
    await userEvent.click(screen.getByRole("button", { name: /continuar/i }));
    await userEvent.click(screen.getByRole("button", { name: /concluir configuração/i }));

    await waitFor(() => {
      expect(requests).toContainEqual({ backupAcknowledged: true });
    });
  });

  it("can complete setup without creating optional initial users", async () => {
    let companySettings: CompanySettings | null = null;
    let completed = false;

    server.use(
      http.get(`${testApiUrl}/setup/status`, () => {
        return HttpResponse.json(
          setupStatusResponse({
            setupCompleted: completed,
            setupCompletedAt: completed ? "2026-08-18T00:00:00.000Z" : null,
            companySettings,
          })
        );
      }),
      http.patch(`${testApiUrl}/setup/company`, () => {
        companySettings = {
          id: "company-id",
          name: "Assistencia Sem Usuarios",
          document: null,
          phone: null,
          email: null,
          address: null,
          zipCode: null,
          setupCompleted: false,
          setupCompletedAt: null,
          createdAt: "2026-08-18T00:00:00.000Z",
          updatedAt: "2026-08-18T00:00:00.000Z",
        };

        return HttpResponse.json(companySettings);
      }),
      http.patch(`${testApiUrl}/setup/admin`, () => {
        return HttpResponse.json({
          id: adminUser.id,
          name: adminUser.name,
          login: adminUser.login,
          role: "ADMIN",
          active: true,
          createdAt: "2026-08-18T00:00:00.000Z",
          updatedAt: "2026-08-18T00:00:00.000Z",
        });
      }),
      http.post(`${testApiUrl}/setup/complete`, () => {
        completed = true;

        return HttpResponse.json({
          setupCompleted: true,
          setupCompletedAt: "2026-08-18T00:00:00.000Z",
        });
      })
    );

    renderWithProviders(<SetupPage />, {
      route: "/setup",
      user: adminUser,
    });

    await userEvent.click(await screen.findByRole("button", { name: /começar configuração/i }));
    await userEvent.type(screen.getByLabelText(/nome da assistência/i), "Assistencia Sem Usuarios");
    await userEvent.click(screen.getByRole("button", { name: /salvar empresa/i }));
    await userEvent.click(await screen.findByRole("button", { name: /salvar administrador/i }));
    await screen.findByRole("heading", { name: /usuários iniciais/i });
    await userEvent.click(screen.getByRole("button", { name: /continuar/i }));
    await userEvent.click(screen.getByLabelText(/backups devem ser configurados/i));
    await userEvent.click(screen.getByRole("button", { name: /continuar/i }));
    await userEvent.click(screen.getByRole("button", { name: /concluir configuração/i }));

    await waitFor(() => {
      expect(completed).toBe(true);
    });
  });
});
