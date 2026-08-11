import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Dashboard } from "../pages/Dashboard";
import { Login } from "../pages/Login";
import { ModulePlaceholder } from "../pages/ModulePlaceholder";
import { NotFound } from "../pages/NotFound";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/customers"
            element={<ModulePlaceholder title="Clientes" />}
          />
          <Route
            path="/equipments"
            element={<ModulePlaceholder title="Equipamentos" />}
          />
          <Route
            path="/service-orders"
            element={<ModulePlaceholder title="Ordens de Servico" />}
          />
          <Route path="/parts" element={<ModulePlaceholder title="Estoque" />} />
          <Route
            path="/users"
            element={<ModulePlaceholder title="Usuarios" />}
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
