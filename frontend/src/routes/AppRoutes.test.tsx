import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "./AppRoutes";
import { renderWithProviders } from "../test/helpers/renderWithProviders";

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
      },
    });

    expect(await screen.findByText(/acesso negado/i)).toBeInTheDocument();
  });
});
