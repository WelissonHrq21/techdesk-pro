import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../contexts/authContextValue";
import type { AuthUser } from "../../types/auth";

type RenderOptions = {
  route?: string;
  user?: AuthUser | null;
};

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", user = null }: RenderOptions = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          token: user ? "token" : null,
          isAuthenticated: Boolean(user),
          isLoadingSession: false,
          signIn: async () => undefined,
          signOut: () => undefined,
        }}
      >
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
