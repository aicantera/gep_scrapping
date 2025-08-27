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
  const storeUser = localStorage.getItem("sb-masterd-auth-token");
  const storeUserParse = storeUser ? JSON.parse(storeUser) : null;

  if (loading) return <Loading connectionStatus={connectionStatus} />;
  if (connectionStatus === "error") return <ConnectionStatusError />;
  if (user && !userRole) return <UserRoleError />;

  // Solo redirige si la conexión está establecida, no hay usuario Y no hay usuario en localStorage
  if (!user && !loading && !storeUserParse) {
    return <Navigate to="/login" replace />;
  }

  if (user) return children;

  // Evita renderizar nada mientras se restaura la sesión desde el token
  return null;
};

export default ProtectedRoute;
