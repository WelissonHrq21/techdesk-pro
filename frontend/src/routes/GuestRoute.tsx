import { Navigate, Outlet } from "react-router-dom";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { useAuth } from "../hooks/useAuth";

export function GuestRoute() {
  const { isAuthenticated, isLoadingSession } = useAuth();

  if (isLoadingSession) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
