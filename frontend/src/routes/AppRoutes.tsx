import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { CustomerDetailPage } from "../features/customers/pages/CustomerDetailPage";
import { CustomersPage } from "../features/customers/pages/CustomersPage";
import { EquipmentsPage } from "../features/equipments/pages/EquipmentsPage";
import { NewServiceOrderPage } from "../features/service-orders/pages/NewServiceOrderPage";
import { ServiceOrderDetailPage } from "../features/service-orders/pages/ServiceOrderDetailPage";
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
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/equipments" element={<EquipmentsPage />} />
          <Route
            path="/service-orders"
            element={<ModulePlaceholder title="Ordens de Servico" />}
          />
          <Route path="/service-orders/new" element={<NewServiceOrderPage />} />
          <Route
            path="/service-orders/:id"
            element={<ServiceOrderDetailPage />}
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
