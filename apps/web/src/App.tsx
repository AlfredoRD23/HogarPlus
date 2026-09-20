import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppLayout } from "./components/AppLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ClientsPage, ClientDetailPage } from "./pages/ClientsPage";
import { ProductsPage } from "./pages/ProductsPage";
import { InventoryPage } from "./pages/InventoryPage";
import { CreditsPage, CreditDetailPage, NewCreditPage } from "./pages/CreditsPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { CollectionsPage } from "./pages/CollectionsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { UsersPage } from "./pages/UsersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PortalPage } from "./pages/PortalPage";
import { RoutesPage } from "./pages/RoutesPage";
import { RequestsPage } from "./pages/RequestsPage";
import type { ReactNode } from "react";

function Guard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-navy-900">Cargando HogarPlus...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/portal" element={<PortalPage />} />
      <Route
        element={
          <Guard>
            <AppLayout />
          </Guard>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clientes" element={<ClientsPage />} />
        <Route path="/clientes/:id" element={<ClientDetailPage />} />
        <Route path="/productos" element={<ProductsPage />} />
        <Route path="/inventario" element={<InventoryPage />} />
        <Route path="/creditos" element={<CreditsPage />} />
        <Route path="/creditos/nuevo" element={<NewCreditPage />} />
        <Route path="/creditos/:id" element={<CreditDetailPage />} />
        <Route path="/pagos" element={<PaymentsPage />} />
        <Route path="/cobranza" element={<CollectionsPage />} />
        <Route path="/rutas" element={<RoutesPage />} />
        <Route path="/solicitudes" element={<RequestsPage />} />
        <Route path="/reportes" element={<ReportsPage />} />
        <Route path="/gastos" element={<ExpensesPage />} />
        <Route path="/usuarios" element={<UsersPage />} />
        <Route path="/configuracion" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
