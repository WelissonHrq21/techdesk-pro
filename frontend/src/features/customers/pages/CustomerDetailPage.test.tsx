import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../../../contexts/ToastContext";
import { testApiUrl } from "../../../test/apiUrl";
import { renderWithProviders } from "../../../test/helpers/renderWithProviders";
import { server } from "../../../test/server";
import type { AuthUser } from "../../../types/auth";
import { CustomerDetailPage } from "./CustomerDetailPage";

const customerId = "11111111-1111-4111-8111-111111111111";

const roleUsers: Record<AuthUser["role"], AuthUser> = {
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
    name: "Tecnico",
    login: "tecnico",
    role: "TECHNICIAN",
    setupCompleted: true,
  },
};

function customerResponse(document?: string | null) {
  return {
    id: customerId,
    name: "Cliente Documento",
    phone: "82999990000",
    ...(document !== undefined ? { document } : {}),
    email: null,
    zipCode: null,
    address: null,
    active: true,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
  };
}

function renderDetail(role: AuthUser["role"], document?: string | null) {
  server.use(
    http.get(`${testApiUrl}/customers/${customerId}`, () => {
      return HttpResponse.json(customerResponse(document));
    }),
    http.get(`${testApiUrl}/equipments`, () => {
      return HttpResponse.json({
        data: [],
        meta: {
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    })
  );

  renderWithProviders(
    <ToastProvider>
      <Routes>
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
      </Routes>
    </ToastProvider>,
    {
      route: `/customers/${customerId}`,
      user: roleUsers[role],
    }
  );
}

describe("CustomerDetailPage document privacy", () => {
  it.each(["ADMIN", "RECEPTION"] as const)(
    "shows formatted document for %s",
    async (role) => {
      renderDetail(role, "52998224725");

      expect(await screen.findByText("Cliente Documento")).toBeInTheDocument();
      expect(screen.getByText("529.982.247-25")).toBeInTheDocument();
    }
  );

  it("shows formatted alphanumeric CNPJ for authorized roles", async () => {
    renderDetail("ADMIN", "12ABC34501DE35");

    expect(await screen.findByText("Cliente Documento")).toBeInTheDocument();
    expect(screen.getByText("12.ABC.345/01DE-35")).toBeInTheDocument();
  });

  it("does not show document for TECHNICIAN", async () => {
    renderDetail("TECHNICIAN", undefined);

    expect(await screen.findByText("Cliente Documento")).toBeInTheDocument();
    expect(screen.queryByText(/CPF\/CNPJ/i)).not.toBeInTheDocument();
  });

  it("edits, replaces and removes customer document using the agreed contract", async () => {
    const requests: unknown[] = [];

    server.use(
      http.get(`${testApiUrl}/customers/${customerId}`, () => {
        return HttpResponse.json(customerResponse(null));
      }),
      http.put(`${testApiUrl}/customers/${customerId}`, async ({ request }) => {
        requests.push(await request.json());

        return HttpResponse.json({ message: "Customer updated successfully" });
      })
    );

    renderDetail("ADMIN", null);

    await userEvent.click(await screen.findByRole("button", { name: /editar/i }));
    await userEvent.type(screen.getByLabelText(/cpf\/cnpj/i), "52998224725");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(requests[0]).toMatchObject({ document: "52998224725" });

    await userEvent.click(screen.getByRole("button", { name: /editar/i }));
    await userEvent.clear(screen.getByLabelText(/cpf\/cnpj/i));
    await userEvent.type(
      screen.getByLabelText(/cpf\/cnpj/i),
      "12.abc.345/01de-35"
    );
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(requests).toHaveLength(2);
    });
    expect(requests[1]).toMatchObject({ document: "12ABC34501DE35" });

    await userEvent.click(screen.getByRole("button", { name: /editar/i }));
    await userEvent.clear(screen.getByLabelText(/cpf\/cnpj/i));
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(requests).toHaveLength(3);
    });
    expect(requests[2]).toMatchObject({ document: null });
  });
});
