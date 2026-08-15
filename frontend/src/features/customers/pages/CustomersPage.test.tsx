import { http, HttpResponse } from "msw";
import { useLocation } from "react-router-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../../../contexts/ToastContext";
import { testApiUrl } from "../../../test/apiUrl";
import { renderWithProviders } from "../../../test/helpers/renderWithProviders";
import { server } from "../../../test/server";
import { CustomersPage } from "./CustomersPage";

const customerId = "11111111-1111-4111-8111-111111111111";

function LocationProbe() {
  const location = useLocation();

  return <span data-testid="location">{location.pathname}{location.search}</span>;
}

describe("CustomersPage", () => {
  it("continues to new service order after creating a customer", async () => {
    server.use(
      http.get(`${testApiUrl}/customers`, () => {
        return HttpResponse.json({
          data: [],
          meta: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }),
      http.post(`${testApiUrl}/customers`, async () => {
        return HttpResponse.json(
          {
            id: customerId,
            name: "Cliente Piloto",
            phone: "82999990000",
            email: null,
            active: true,
            createdAt: "2026-08-14T00:00:00.000Z",
            updatedAt: "2026-08-14T00:00:00.000Z",
          },
          { status: 201 }
        );
      })
    );

    renderWithProviders(
      <ToastProvider>
        <CustomersPage />
        <LocationProbe />
      </ToastProvider>,
      {
        route: "/customers",
        user: {
          id: "admin-id",
          name: "Admin",
          login: "admin",
          role: "ADMIN",
        },
      }
    );

    await userEvent.click(screen.getByRole("button", { name: /novo cliente/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), "Cliente Piloto");
    await userEvent.type(screen.getByLabelText(/telefone/i), "82999990000");
    await userEvent.click(
      screen.getByRole("button", { name: /cadastrar cliente/i })
    );

    expect(await screen.findByTestId("location")).toHaveTextContent(
      `/service-orders/new?customerId=${customerId}`
    );
  });
});
