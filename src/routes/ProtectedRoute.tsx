import ConnectionStatusError from "@/components/ConnectionStatusError";
import Loading from "@/components/Loading";
import UserRoleError from "@/components/UserRoleError";
import { useAuth } from "@/contexts/AuthContext";
import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface Props {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const { user, loading, connectionStatus, userRole } = useAuth();

  if (loading) return <Loading connectionStatus={connectionStatus} />;
  if (connectionStatus === "error") return <ConnectionStatusError />;
  if (user && !userRole) return <UserRoleError />;

  // Solo redirige si la conexión está establecida y no hay usuario
  if (!user && !loading && connectionStatus === "connected") {
    return <Navigate to="/login" replace />;
  }

  if (user && !loading) return children;

  // Evita renderizar nada mientras loading o connecting
  return null;
};

export default ProtectedRoute;
