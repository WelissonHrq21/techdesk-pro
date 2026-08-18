import { http, HttpResponse } from "msw";
import { useLocation } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../../../contexts/ToastContext";
import { testApiUrl } from "../../../test/apiUrl";
import { renderWithProviders } from "../../../test/helpers/renderWithProviders";
import { server } from "../../../test/server";
import { CustomersPage } from "./CustomersPage";

const customerId = "11111111-1111-4111-8111-111111111111";
const emptyCustomersResponse = {
  data: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

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
          setupCompleted: true,
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

  it("accepts an optional document and sends CPF normalized", async () => {
    const requests: unknown[] = [];

    server.use(
      http.get(`${testApiUrl}/customers`, () => {
        return HttpResponse.json(emptyCustomersResponse);
      }),
      http.post(`${testApiUrl}/customers`, async ({ request }) => {
        const body = await request.json();
        requests.push(body);

        return HttpResponse.json(
          {
            id: customerId,
            name: "Cliente CPF",
            phone: "82999990000",
            document: "52998224725",
            email: null,
            active: true,
            createdAt: "2026-08-17T00:00:00.000Z",
            updatedAt: "2026-08-17T00:00:00.000Z",
          },
          { status: 201 }
        );
      })
    );

    renderCustomersPage();

    await userEvent.click(screen.getByRole("button", { name: /novo cliente/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), "Cliente CPF");
    await userEvent.type(screen.getByLabelText(/telefone/i), "82999990000");
    await userEvent.type(screen.getByLabelText(/cpf\/cnpj/i), "52998224725");

    expect(screen.getByLabelText(/cpf\/cnpj/i)).toHaveValue("529.982.247-25");

    await userEvent.click(
      screen.getByRole("button", { name: /cadastrar cliente/i })
    );

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(requests[0]).toMatchObject({ document: "52998224725" });
  });

  it("accepts CNPJ with mask and sends it normalized", async () => {
    const requests: unknown[] = [];

    server.use(
      http.get(`${testApiUrl}/customers`, () => {
        return HttpResponse.json(emptyCustomersResponse);
      }),
      http.post(`${testApiUrl}/customers`, async ({ request }) => {
        requests.push(await request.json());

        return HttpResponse.json(
          {
            id: customerId,
            name: "Empresa CNPJ",
            phone: "82999990000",
            document: "11222333000181",
            email: null,
            active: true,
            createdAt: "2026-08-17T00:00:00.000Z",
            updatedAt: "2026-08-17T00:00:00.000Z",
          },
          { status: 201 }
        );
      })
    );

    renderCustomersPage();

    await userEvent.click(screen.getByRole("button", { name: /novo cliente/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), "Empresa CNPJ");
    await userEvent.type(screen.getByLabelText(/telefone/i), "82999990000");
    await userEvent.type(
      screen.getByLabelText(/cpf\/cnpj/i),
      "11.222.333/0001-81"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /cadastrar cliente/i })
    );

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(requests[0]).toMatchObject({ document: "11222333000181" });
  });

  it("accepts alphanumeric CNPJ with lowercase and sends uppercase normalized", async () => {
    const requests: unknown[] = [];

    server.use(
      http.get(`${testApiUrl}/customers`, () => {
        return HttpResponse.json(emptyCustomersResponse);
      }),
      http.post(`${testApiUrl}/customers`, async ({ request }) => {
        requests.push(await request.json());

        return HttpResponse.json(
          {
            id: customerId,
            name: "Empresa Alfanumerica",
            phone: "82999990000",
            document: "12ABC34501DE35",
            email: null,
            active: true,
            createdAt: "2026-08-17T00:00:00.000Z",
            updatedAt: "2026-08-17T00:00:00.000Z",
          },
          { status: 201 }
        );
      })
    );

    renderCustomersPage();

    await userEvent.click(screen.getByRole("button", { name: /novo cliente/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), "Empresa Alfanumerica");
    await userEvent.type(screen.getByLabelText(/telefone/i), "82999990000");
    await userEvent.type(
      screen.getByLabelText(/cpf\/cnpj/i),
      "12.abc.345/01de-35"
    );

    expect(screen.getByLabelText(/cpf\/cnpj/i)).toHaveValue(
      "12.ABC.345/01DE-35"
    );

    await userEvent.click(
      screen.getByRole("button", { name: /cadastrar cliente/i })
    );

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(requests[0]).toMatchObject({ document: "12ABC34501DE35" });
  });

  it.each(["123.456.789-00", "11.222.333/0001-80"])(
    "blocks invalid document %s before sending",
    async (document) => {
      const requests: unknown[] = [];

      server.use(
        http.get(`${testApiUrl}/customers`, () => {
          return HttpResponse.json(emptyCustomersResponse);
        }),
        http.post(`${testApiUrl}/customers`, async ({ request }) => {
          requests.push(await request.json());
          return HttpResponse.json({}, { status: 201 });
        })
      );

      renderCustomersPage();

      await userEvent.click(screen.getByRole("button", { name: /novo cliente/i }));
      await userEvent.type(screen.getByLabelText(/nome/i), "Cliente Invalido");
      await userEvent.type(screen.getByLabelText(/telefone/i), "82999990000");
      await userEvent.type(screen.getByLabelText(/cpf\/cnpj/i), document);
      await userEvent.click(
        screen.getByRole("button", { name: /cadastrar cliente/i })
      );

      expect(
        await screen.findByText(/informe um cpf ou cnpj válido/i)
      ).toBeInTheDocument();
      expect(requests).toHaveLength(0);
    }
  );

  it("blocks alphanumeric CNPJ with invalid verifier digit before sending", async () => {
    const requests: unknown[] = [];

    server.use(
      http.get(`${testApiUrl}/customers`, () => {
        return HttpResponse.json(emptyCustomersResponse);
      }),
      http.post(`${testApiUrl}/customers`, async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json({}, { status: 201 });
      })
    );

    renderCustomersPage();

    await userEvent.click(screen.getByRole("button", { name: /novo cliente/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), "Empresa Invalida");
    await userEvent.type(screen.getByLabelText(/telefone/i), "82999990000");
    await userEvent.type(
      screen.getByLabelText(/cpf\/cnpj/i),
      "12.ABC.345/01DE-36"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /cadastrar cliente/i })
    );

    expect(
      await screen.findByText(/informe um cpf ou cnpj válido/i)
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it("shows a friendly duplicated document message", async () => {
    server.use(
      http.get(`${testApiUrl}/customers`, () => {
        return HttpResponse.json(emptyCustomersResponse);
      }),
      http.post(`${testApiUrl}/customers`, () => {
        return HttpResponse.json(
          { message: "Customer document already exists" },
          { status: 409 }
        );
      })
    );

    renderCustomersPage();

    await userEvent.click(screen.getByRole("button", { name: /novo cliente/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), "Cliente Duplicado");
    await userEvent.type(screen.getByLabelText(/telefone/i), "82999990000");
    await userEvent.type(screen.getByLabelText(/cpf\/cnpj/i), "52998224725");
    await userEvent.click(
      screen.getByRole("button", { name: /cadastrar cliente/i })
    );

    expect(
      await screen.findByText(/ja existe um cliente cadastrado com este cpf\/cnpj/i)
    ).toBeInTheDocument();
  });

  it("searches by CPF, numeric CNPJ or alphanumeric CNPJ text", async () => {
    const searches: string[] = [];

    server.use(
      http.get(`${testApiUrl}/customers`, ({ request }) => {
        const url = new URL(request.url);
        const search = url.searchParams.get("search");

        if (search) {
          searches.push(search);
        }

        return HttpResponse.json({
          data: search
            ? [
                {
                  id: customerId,
                  name: search.includes("abc")
                    ? "Empresa Alfanumerica"
                    : "Cliente Busca",
                  phone: "82999990000",
                  document: search.includes("abc")
                    ? "12ABC34501DE35"
                    : "52998224725",
                  email: null,
                  active: true,
                  createdAt: "2026-08-17T00:00:00.000Z",
                  updatedAt: "2026-08-17T00:00:00.000Z",
                },
              ]
            : [],
          meta: emptyCustomersResponse.meta,
        });
      })
    );

    renderCustomersPage();

    await userEvent.type(
      screen.getByPlaceholderText(/cpf\/cnpj/i),
      "529.982.247-25"
    );

    expect(await screen.findByText("Cliente Busca")).toBeInTheDocument();
    expect(searches).toContain("529.982.247-25");

    await userEvent.clear(screen.getByPlaceholderText(/cpf\/cnpj/i));
    await userEvent.type(
      screen.getByPlaceholderText(/cpf\/cnpj/i),
      "12.abc.345/01de-35"
    );

    expect(await screen.findByText("Empresa Alfanumerica")).toBeInTheDocument();
    expect(searches).toContain("12.abc.345/01de-35");
  });
});

function renderCustomersPage() {
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
        setupCompleted: true,
      },
    }
  );
}
