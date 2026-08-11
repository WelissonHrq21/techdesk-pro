import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../../routes/AppRoutes";
import { renderWithProviders } from "../../../test/helpers/renderWithProviders";

describe("TrackServiceOrderPage", () => {
  it("renders public service order without authentication", async () => {
    renderWithProviders(<AppRoutes />, {
      route: "/track/valid-token",
    });

    expect(await screen.findByText(/OS #142/i)).toBeInTheDocument();
    expect(screen.getByText(/Em manutencao/i)).toBeInTheDocument();
    expect(screen.getByText(/Notebook Acer Nitro 5/i)).toBeInTheDocument();
  });

  it("renders safe not found message for invalid token", async () => {
    renderWithProviders(<AppRoutes />, {
      route: "/track/invalid-token",
    });

    expect(
      await screen.findByText(/nao foi possivel localizar/i)
    ).toBeInTheDocument();
  });
});
