import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute() {
  const { isAuthenticated, isLoadingSession, user } = useAuth();
  const location = useLocation();

  if (isLoadingSession) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user && !user.setupCompleted && location.pathname !== "/setup") {
    if (user.role !== "ADMIN" && location.pathname !== "/forbidden") {
      return <Navigate to="/forbidden" replace />;
    }

    if (user.role === "ADMIN") {
      return <Navigate to="/setup" replace />;
    }
  }

  return <Outlet />;
}
