import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Route, Routes } from "react-router-dom";
import { Suspense } from "react";
import Loading from "@/components/Loading";
import AppLayout from "@/components/AppLayout";
import { LoginForm } from "@/components/LoginForm";
import DocumentManagement from "@/components/DocumentManagement";
import AlertsManagement from "@/components/AlertsManagement";
import ClientsManagement from "@/components/ClientsManagement";
import ThemeManagement from "@/components/ThemeManagement";
import UserManagement from "@/components/UserManagement";
import BotsExecution from "@/components/BotsExecution";
import DashboardHome from "@/components/DashboardHome";
// import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedRoute from "./ProtectedRoute";

const adminRoutes = [
  <Route path="gestion-documental" element={<DocumentManagement />} />,
  <Route path="alertas-monitoreo" element={<AlertsManagement />} />,
  <Route path="gestion-clientes" element={<ClientsManagement />} />,
  <Route path="gestion-temas" element={<ThemeManagement />} />,
  <Route path="gestion-usuarios" element={<UserManagement />} />,
  <Route path="ejecucion-bots" element={<BotsExecution />} />,
];

const analistaRoutes = [
  <Route path="gestion-documental" element={<DocumentManagement />} />,
  <Route path="alertas-monitoreo" element={<AlertsManagement />} />,
  <Route path="ejecucion-bots" element={<BotsExecution />} />,
];

const AppRouter = () => {
  const { connectionStatus, userRole } = useAuth();

  return (
    <>
      <Suspense fallback={<Loading connectionStatus={connectionStatus} />}>
        <Routes>
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<DashboardHome />} />
            {userRole === "Administrador" && adminRoutes}
            {userRole === "Analista GEP" && analistaRoutes}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          <Route path="/login" element={<LoginForm />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default AppRouter;
