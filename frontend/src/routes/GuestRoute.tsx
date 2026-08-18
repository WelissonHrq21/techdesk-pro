import { Navigate, Outlet } from "react-router-dom";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { useAuth } from "../hooks/useAuth";

export function GuestRoute() {
  const { isAuthenticated, isLoadingSession, user } = useAuth();

  if (isLoadingSession) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    if (user?.role === "ADMIN" && !user.setupCompleted) {
      return <Navigate to="/setup" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
