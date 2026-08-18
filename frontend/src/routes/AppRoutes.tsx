import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { CustomerDetailPage } from "../features/customers/pages/CustomerDetailPage";
import { CustomersPage } from "../features/customers/pages/CustomersPage";
import { EquipmentsPage } from "../features/equipments/pages/EquipmentsPage";
import { PartDetailPage } from "../features/parts/pages/PartDetailPage";
import { PartsPage } from "../features/parts/pages/PartsPage";
import { ProfilePage } from "../features/profile/pages/ProfilePage";
import { BudgetPrintPage } from "../features/print/pages/BudgetPrintPage";
import { ServiceOrderReceiptPrintPage } from "../features/print/pages/ServiceOrderReceiptPrintPage";
import { TrackServiceOrderPage } from "../features/public-tracking/pages/TrackServiceOrderPage";
import { NewServiceOrderPage } from "../features/service-orders/pages/NewServiceOrderPage";
import { ServiceOrderDetailPage } from "../features/service-orders/pages/ServiceOrderDetailPage";
import { ServiceOrdersPage } from "../features/service-orders/pages/ServiceOrdersPage";
import { SetupPage } from "../features/setup/pages/SetupPage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";
import { UsersPage } from "../features/users/pages/UsersPage";
import { Dashboard } from "../pages/Dashboard";
import { Forbidden } from "../pages/Forbidden";
import { Login } from "../pages/Login";
import { NotFound } from "../pages/NotFound";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>
      <Route path="/track/:token" element={<TrackServiceOrderPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/setup" element={<SetupPage />} />
        <Route
          path="/service-orders/:id/print"
          element={<ServiceOrderReceiptPrintPage />}
        />
        <Route
          path="/service-orders/:id/budgets/:budgetId/print"
          element={<BudgetPrintPage />}
        />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/equipments" element={<EquipmentsPage />} />
          <Route path="/service-orders" element={<ServiceOrdersPage />} />
          <Route path="/service-orders/new" element={<NewServiceOrderPage />} />
          <Route
            path="/service-orders/:id"
            element={<ServiceOrderDetailPage />}
          />
          <Route path="/parts" element={<PartsPage />} />
          <Route path="/parts/:id" element={<PartDetailPage />} />
          <Route element={<RoleRoute roles={["ADMIN"]} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
