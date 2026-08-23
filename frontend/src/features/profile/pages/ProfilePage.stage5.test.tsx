import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../contexts/authContextValue";
import { ToastProvider } from "../../../contexts/ToastContext";
import { testApiUrl } from "../../../test/apiUrl";
import { server } from "../../../test/server";
import { Login } from "../../../pages/Login";
import { render } from "@testing-library/react";
import { ProfilePage } from "./ProfilePage";

const user = {
  id: "admin-id",
  name: "Admin",
  login: "admin",
  role: "ADMIN" as const,
  setupCompleted: true,
};

describe("Profile session revocation", () => {
  it("logs out with a reauthentication message after changing password", async () => {
    const signOut = vi.fn();
    const queryClient = new QueryClient();

    server.use(
      http.put(`${testApiUrl}/me/password`, () =>
        HttpResponse.json({ message: "Password changed successfully" })
      )
    );

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            user,
            token: "token",
            isAuthenticated: true,
            isLoadingSession: false,
            signIn: async () => undefined,
            signOut,
            refreshProfile: async () => undefined,
          }}
        >
          <MemoryRouter>
            <ToastProvider>
              <ProfilePage />
            </ToastProvider>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    await userEvent.type(screen.getByLabelText("Senha atual"), "senha123");
    await userEvent.type(screen.getByLabelText("Nova senha"), "nova123");
    await userEvent.type(
      screen.getByLabelText("Confirmar nova senha"),
      "nova123"
    );
    await userEvent.click(screen.getByRole("button", { name: "Alterar senha" }));

    expect(signOut).toHaveBeenCalledWith("Senha alterada. Entre novamente.");
  });

  it("renders the password-change message on the login page", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            user: null,
            token: null,
            isAuthenticated: false,
            isLoadingSession: false,
            signIn: async () => undefined,
            signOut: () => undefined,
            refreshProfile: async () => undefined,
          }}
        >
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/login",
                state: { message: "Senha alterada. Entre novamente." },
              },
            ]}
          >
            <Login />
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Senha alterada. Entre novamente."
    );
  });
});
