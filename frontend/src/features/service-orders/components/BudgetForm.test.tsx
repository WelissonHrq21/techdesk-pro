import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/helpers/renderWithProviders";
import type { BudgetItemFormData } from "../types/serviceOrder";
import { BudgetForm } from "./BudgetForm";

const partId = "11111111-1111-4111-8111-111111111111";
const initialParts = {
  [partId]: {
    id: partId,
    name: "SSD Kingston 480GB",
    brand: "Kingston",
    currentPrice: "250",
    stock: 5,
  },
};

function renderForm({
  mode = "create",
  defaultItems,
  consumedByPartId,
  isSubmitting = false,
}: {
  mode?: "create" | "revision";
  defaultItems?: BudgetItemFormData[];
  consumedByPartId?: Record<string, number>;
  isSubmitting?: boolean;
} = {}) {
  const onSubmit = vi.fn();

  renderWithProviders(
    <BudgetForm
      mode={mode}
      defaultItems={defaultItems}
      initialParts={initialParts}
      consumedByPartId={consumedByPartId}
      isSubmitting={isSubmitting}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
    />
  );

  return { onSubmit };
}

describe("BudgetForm mixed budget experience", () => {
  it("adds a new PART line explicitly", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(
      screen.getByRole("button", { name: /adicionar peça/i })
    );

    expect(
      screen.getAllByRole("button", { name: /remover peça/i })
    ).toHaveLength(2);
  });

  it("adds and edits PART and SERVICE lines with a mixed total", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      defaultItems: [
        {
          type: "PART",
          partId,
          quantity: 1,
          unitPrice: 250,
        },
      ],
    });

    await user.click(
      screen.getByRole("button", { name: /adicionar serviço/i })
    );
    await user.type(
      screen.getByRole("textbox", { name: /descrição do serviço/i }),
      "Formatação"
    );

    const quantities = screen.getAllByRole("spinbutton", { name: /qtd/i });
    const prices = screen.getAllByRole("spinbutton", {
      name: /valor unit/i,
    });
    await user.clear(quantities[1]);
    await user.type(quantities[1], "2");
    await user.clear(prices[1]);
    await user.type(prices[1], "50");

    expect(
      screen.getByText("Total previsto").nextElementSibling
    ).toHaveTextContent("350,00");

    await user.click(
      screen.getByRole("button", { name: /criar orçamento/i })
    );

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ type: "PART", partId }),
          expect.objectContaining({
            type: "SERVICE",
            description: "Formatação",
            quantity: 2,
            unitPrice: 50,
          }),
        ],
      })
    );
  });

  it("creates a SERVICE-only budget after removing the initial PART", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.click(
      screen.getByRole("button", { name: /remover peça 1/i })
    );
    expect(screen.getByText(/nenhum item no orçamento/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /adicionar serviço/i })
    );
    await user.type(
      screen.getByRole("textbox", { name: /descrição do serviço/i }),
      "Limpeza interna"
    );
    const price = screen.getByRole("spinbutton", { name: /valor unit/i });
    await user.clear(price);
    await user.type(price, "80.50");
    expect(
      screen.getByText("Total previsto").nextElementSibling
    ).toHaveTextContent("80,50");
    await user.click(
      screen.getByRole("button", { name: /criar orçamento/i })
    );

    expect(onSubmit.mock.calls[0]?.[0].items).toEqual([
      {
        type: "SERVICE",
        description: "Limpeza interna",
        quantity: 1,
        unitPrice: 80.5,
      },
    ]);
  });

  it("removes PART and SERVICE lines independently", async () => {
    const user = userEvent.setup();
    renderForm({
      defaultItems: [
        { type: "PART", partId, quantity: 1, unitPrice: 250 },
        {
          type: "SERVICE",
          description: "Configuração",
          quantity: 1,
          unitPrice: 100,
        },
      ],
    });

    await user.click(
      screen.getByRole("button", { name: /remover serviço 2/i })
    );
    expect(
      screen.queryByDisplayValue("Configuração")
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /remover peça 1/i })
    );
    expect(screen.getByText(/nenhum item no orçamento/i)).toBeInTheDocument();
  });

  it("shows understandable validation errors for PART and SERVICE", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(
      screen.getByRole("button", { name: /adicionar serviço/i })
    );
    await user.click(
      screen.getByRole("button", { name: /criar orçamento/i })
    );

    expect(
      await screen.findByText(/selecione uma peça válida/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/informe a descrição do serviço/i)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/valor unitario deve ser positivo/i)
    ).toHaveLength(2);
  });

  it("loads both item types into a revision and protects consumed PART", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      mode: "revision",
      consumedByPartId: { [partId]: 2 },
      defaultItems: [
        { type: "PART", partId, quantity: 2, unitPrice: 250 },
        {
          type: "SERVICE",
          description: "Mão de obra",
          quantity: 1,
          unitPrice: 100,
        },
      ],
    });

    expect(screen.getByDisplayValue("Mão de obra")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remover peça 1/i })
    ).toBeDisabled();
    await user.clear(screen.getAllByRole("spinbutton", { name: /qtd/i })[0]);
    await user.type(
      screen.getAllByRole("spinbutton", { name: /qtd/i })[0],
      "1"
    );
    await user.click(
      screen.getByRole("button", { name: /criar revisão/i })
    );

    expect(
      await screen.findByText(/abaixo da quantidade já consumida/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps controls usable in a narrow viewport and disables duplicate submit", () => {
    window.innerWidth = 390;
    renderForm({ isSubmitting: true });

    const form = screen.getByRole("button", { name: /salvando/i }).closest(
      "form"
    );
    expect(form).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /salvando/i })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /adicionar peça/i })
    ).toBeDisabled();
    expect(within(form!).getAllByText("Peça")).toHaveLength(2);
  });
});
