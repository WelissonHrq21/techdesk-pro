import type { QueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { registerUnauthorizedHandler } from "../api/http";
import { getProfileRequest, signInRequest } from "../services/authService";
import type { AuthUser } from "../types/auth";
import {
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  storeSession,
} from "../utils/authStorage";
import { AuthContext, type AuthContextValue } from "./authContextValue";

type AuthProviderProps = {
  children: ReactNode;
  queryClient: QueryClient;
};

export function AuthProvider({ children, queryClient }: AuthProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const signOut = useCallback((message?: string) => {
    clearSession();
    navigate("/login", {
      replace: true,
      state: message ? { message } : undefined,
    });
  }, [clearSession, navigate]);

  const refreshProfile = useCallback(async () => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      return;
    }

    const profile = await getProfileRequest();

    setToken(storedToken);
    setUser(profile);
    storeSession(storedToken, profile);
  }, []);

  useEffect(() => {
    return registerUnauthorizedHandler((message) => {
      clearSession();

      if (location.pathname.startsWith("/track/")) {
        return;
      }

      navigate("/login", {
        replace: true,
        state: message ? { message } : undefined,
      });
    });
  }, [clearSession, location.pathname, navigate]);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedToken = getStoredToken();

      if (!storedToken) {
        if (isMounted) {
          setIsLoadingSession(false);
        }
        return;
      }

      try {
        const profile = await getProfileRequest();

        if (!isMounted) {
          return;
        }

        setToken(storedToken);
        setUser(profile);
        storeSession(storedToken, profile);
      } catch {
        clearSession();
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  const signIn = useCallback(
    async (login: string, password: string) => {
      const session = await signInRequest({ login, password });

      storeSession(session.token, session.user);
      setToken(session.token);
      setUser(session.user);
      queryClient.clear();
      navigate(
        session.user.role === "ADMIN" && !session.user.setupCompleted
          ? "/setup"
          : "/dashboard",
        { replace: true }
      );
    },
    [navigate, queryClient]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoadingSession,
      signIn,
      signOut,
      refreshProfile,
    }),
    [isLoadingSession, refreshProfile, signIn, signOut, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
