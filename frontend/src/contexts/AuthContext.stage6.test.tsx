import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../routes/AppRoutes";
import { testApiUrl } from "../test/apiUrl";
import { server } from "../test/server";
import { ToastProvider } from "./ToastContext";
import { AuthProvider } from "./AuthContext";

function renderApp(route: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider queryClient={queryClient}>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AuthProvider public tracking isolation", () => {
  beforeEach(() => {
    localStorage.setItem("techdesk.token", "revoked-token");
    localStorage.setItem(
      "techdesk.user",
      JSON.stringify({
        id: "stale-user",
        name: "Stale User",
        login: "stale",
        role: "ADMIN",
        setupCompleted: true,
      })
    );
    server.use(
      http.get(`${testApiUrl}/me`, () =>
        HttpResponse.json({ message: "Session revoked" }, { status: 401 })
      )
    );
  });

  it("keeps public tracking open while clearing a stale private session", async () => {
    renderApp("/track/valid-token");

    expect(
      await screen.findByRole(
        "heading",
        { name: /OS #142/i },
        { timeout: 8_000 }
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /entrar/i }))
      .not.toBeInTheDocument();
    await waitFor(() =>
      expect(localStorage.getItem("techdesk.token")).toBeNull()
    );
  }, 10_000);

  it("still redirects a revoked private session to login", async () => {
    renderApp("/dashboard");

    expect(
      await screen.findByRole(
        "heading",
        { name: /entrar/i },
        { timeout: 8_000 }
      )
    ).toBeInTheDocument();
    expect(localStorage.getItem("techdesk.token")).toBeNull();
  }, 10_000);
});
