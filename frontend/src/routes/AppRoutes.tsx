import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";
import { RouteLoadErrorBoundary } from "./RouteLoadErrorBoundary";
import { RoleRoute } from "./RoleRoute";

const AppLayout = lazy(() =>
  import("../components/layout/AppLayout").then((module) => ({
    default: module.AppLayout,
  }))
);
const CustomerDetailPage = lazy(() =>
  import("../features/customers/pages/CustomerDetailPage").then((module) => ({
    default: module.CustomerDetailPage,
  }))
);
const CustomersPage = lazy(() =>
  import("../features/customers/pages/CustomersPage").then((module) => ({
    default: module.CustomersPage,
  }))
);
const EquipmentsPage = lazy(() =>
  import("../features/equipments/pages/EquipmentsPage").then((module) => ({
    default: module.EquipmentsPage,
  }))
);
const PartDetailPage = lazy(() =>
  import("../features/parts/pages/PartDetailPage").then((module) => ({
    default: module.PartDetailPage,
  }))
);
const PartsPage = lazy(() =>
  import("../features/parts/pages/PartsPage").then((module) => ({
    default: module.PartsPage,
  }))
);
const ProfilePage = lazy(() =>
  import("../features/profile/pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  }))
);
const BudgetPrintPage = lazy(() =>
  import("../features/print/pages/BudgetPrintPage").then((module) => ({
    default: module.BudgetPrintPage,
  }))
);
const ServiceOrderReceiptPrintPage = lazy(() =>
  import("../features/print/pages/ServiceOrderReceiptPrintPage").then(
    (module) => ({
      default: module.ServiceOrderReceiptPrintPage,
    })
  )
);
const TrackServiceOrderPage = lazy(() =>
  import("../features/public-tracking/pages/TrackServiceOrderPage").then(
    (module) => ({
      default: module.TrackServiceOrderPage,
    })
  )
);
const NewServiceOrderPage = lazy(() =>
  import("../features/service-orders/pages/NewServiceOrderPage").then(
    (module) => ({
      default: module.NewServiceOrderPage,
    })
  )
);
const ServiceOrderDetailPage = lazy(() =>
  import("../features/service-orders/pages/ServiceOrderDetailPage").then(
    (module) => ({
      default: module.ServiceOrderDetailPage,
    })
  )
);
const ServiceOrdersPage = lazy(() =>
  import("../features/service-orders/pages/ServiceOrdersPage").then(
    (module) => ({
      default: module.ServiceOrdersPage,
    })
  )
);
const SetupPage = lazy(() =>
  import("../features/setup/pages/SetupPage").then((module) => ({
    default: module.SetupPage,
  }))
);
const SettingsPage = lazy(() =>
  import("../features/settings/pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  }))
);
const UsersPage = lazy(() =>
  import("../features/users/pages/UsersPage").then((module) => ({
    default: module.UsersPage,
  }))
);
const Dashboard = lazy(() =>
  import("../pages/Dashboard").then((module) => ({
    default: module.Dashboard,
  }))
);
const Forbidden = lazy(() =>
  import("../pages/Forbidden").then((module) => ({
    default: module.Forbidden,
  }))
);
const Login = lazy(() =>
  import("../pages/Login").then((module) => ({
    default: module.Login,
  }))
);
const NotFound = lazy(() =>
  import("../pages/NotFound").then((module) => ({
    default: module.NotFound,
  }))
);

function lazyElement(Page: LazyExoticComponent<ComponentType>) {
  return (
    <RouteLoadErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Page />
      </Suspense>
    </RouteLoadErrorBoundary>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={lazyElement(Login)} />
      </Route>
      <Route path="/track/:token" element={lazyElement(TrackServiceOrderPage)} />

      <Route element={<ProtectedRoute />}>
        <Route path="/setup" element={lazyElement(SetupPage)} />
        <Route
          path="/service-orders/:id/print"
          element={lazyElement(ServiceOrderReceiptPrintPage)}
        />
        <Route
          path="/service-orders/:id/budgets/:budgetId/print"
          element={lazyElement(BudgetPrintPage)}
        />
        <Route element={lazyElement(AppLayout)}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={lazyElement(Dashboard)} />
          <Route path="/forbidden" element={lazyElement(Forbidden)} />
          <Route path="/profile" element={lazyElement(ProfilePage)} />
          <Route path="/customers" element={lazyElement(CustomersPage)} />
          <Route
            path="/customers/:id"
            element={lazyElement(CustomerDetailPage)}
          />
          <Route path="/equipments" element={lazyElement(EquipmentsPage)} />
          <Route
            path="/service-orders"
            element={lazyElement(ServiceOrdersPage)}
          />
          <Route
            path="/service-orders/new"
            element={lazyElement(NewServiceOrderPage)}
          />
          <Route
            path="/service-orders/:id"
            element={lazyElement(ServiceOrderDetailPage)}
          />
          <Route path="/parts" element={lazyElement(PartsPage)} />
          <Route path="/parts/:id" element={lazyElement(PartDetailPage)} />
          <Route element={<RoleRoute roles={["ADMIN"]} />}>
            <Route path="/users" element={lazyElement(UsersPage)} />
            <Route path="/settings" element={lazyElement(SettingsPage)} />
          </Route>
          <Route path="*" element={lazyElement(NotFound)} />
        </Route>
      </Route>
    </Routes>
  );
}
