import { useState } from "react";

import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  Menu,
  Settings,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import logoNegro from "../assets/images/logonegro.jpg";
import SessionWarning from "./SessionWarning";

const adminRoutes = [
  { icon: <BarChart3 size={20} />, label: "Dashboard", href: "/dashboard" },
  {
    icon: <AlertTriangle size={20} />,
    label: "Alertas y Monitoreo",
    href: "/gestion-alertas",
  },
  {
    icon: <Bot size={20} />,
    label: "Ejecución de Bots",
    href: "/ejecucion-bots",
  },
  {
    icon: <Users size={20} />,
    label: "Gestión de Clientes",
    href: "/gestion-clientes",
  },
  {
    icon: <Settings size={20} />,
    label: "Gestión de Temas",
    href: "/gestion-temas",
  },
  {
    icon: <FileText size={20} />,
    label: "Gestión Documental",
    href: "/gestion-documental",
  },
  {
    icon: <UserCog size={20} />,
    label: "Gestión de Usuarios",
    href: "/gestion-usuarios",
  },
];

const analistaRoutes = [
  { icon: <BarChart3 size={20} />, label: "Dashboard", href: "/dashboard" },
  {
    icon: <AlertTriangle size={20} />,
    label: "Alertas y Monitoreo",
    href: "/gestion-alertas",
  },
  {
    icon: <Bot size={20} />,
    label: "Ejecución de Bots",
    href: "/ejecucion-bots",
  },
  {
    icon: <FileText size={20} />,
    label: "Gestión Documental",
    href: "/gestion-documental",
  },
];

const getPageTitle: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/gestion-documental": "Gestión Documental",
  "/gestion-alertas": "Alertas y Monitoreo",
  "/gestion-clientes": "Gestión de Clientes",
  "/gestion-temas": "Gestión de Temas",
  "/gestion-usuarios": "Gestión de Usuarios",
  "/ejecucion-bots": "Ejecución de Bots",
  "/gestion-documental/:id/editar": "Editar Documento",
  "/gestion-alertas/:id/validar": "Validar Alerta",
  "/gestion-alertas/:id/ver": "Ver Alerta",
};

const getPageTitleFromPath = (currentPath: string): string => {
  if (getPageTitle[currentPath]) {
    return getPageTitle[currentPath];
  }

  for (const [pattern, title] of Object.entries(getPageTitle)) {
    if (pattern.includes(':')) {
      const regexPattern = pattern.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${regexPattern}$`);
      
      if (regex.test(currentPath)) {
        return title;
      }
    }
  }

  return "Página no encontrada";
};

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const currentPathname = location.pathname;
  const routes = userRole === "Administrador" ? adminRoutes : analistaRoutes;

  const confirmLogout = async () => {
    try {
      setLogoutLoading(true);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout: El proceso tardó demasiado")),
          10000
        )
      );

      await Promise.race([signOut(), timeoutPromise]);

      setShowLogoutModal(false);
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <>
      <SessionWarning />
      <div className="min-h-screen bg-gray-50 flex relative">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`
        ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }
        ${sidebarCollapsed ? "md:w-16" : "md:w-64"}
        fixed md:relative inset-y-0 left-0 z-50 md:z-auto
        w-64 bg-white shadow-lg 
        transition-all duration-300 ease-in-out
        flex flex-col
      `}
        >
          {/* Header del sidebar */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            {/* Logo y título - siempre visible en móvil, condicional en desktop */}
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <div className="flex items-center justify-center">
                <div className="w-24 h-20 flex items-center justify-center">
                  <img
                    src={logoNegro}
                    alt="GEP Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Botón de colapsar/expandir */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`
              p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100
              transition-all duration-200
              ${sidebarCollapsed ? "ml-auto" : ""}
            `}
              title={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {sidebarCollapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </button>

            {/* Botón de cerrar para móvil */}
            <button
              title='Cerrar'
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navegación */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {routes?.map((route) => (
                <li key={route.label}>
                  <Link
                    to={route.href}
                    className={`
                      w-full flex items-center p-3 rounded-lg text-left
                      transition-all duration-200
                      ${
                        route.href !== currentPathname
                          ? "hover:!bg-gray-100"
                          : "hover:!text-white"
                      }
                      
                      ${
                        sidebarCollapsed && !mobileMenuOpen
                          ? "justify-center"
                          : "justify-start"
                      }
                      ${
                        route.href === currentPathname
                          ? "!bg-[#D4133D] !text-white"
                          : "!text-gray-700"
                      }
                    `}
                  >
                    <div className="flex-shrink-0">{route.icon}</div>
                    {(!sidebarCollapsed || mobileMenuOpen) && (
                      <span className="ml-3 font-medium">{route.label}</span>
                    )}
                  </Link>
                </li>
              ))}

              {/* Cerrar Sesión como último elemento del menú */}
              <li>
                <button
                  onClick={() => {
                    setShowLogoutModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                  w-full flex items-center p-3 rounded-lg text-left
                  text-red-600 hover:bg-red-50 hover:text-red-700
                  transition-all duration-200
                  ${
                    sidebarCollapsed && !mobileMenuOpen
                      ? "justify-center"
                      : "justify-start"
                  }
                `}
                  title={
                    sidebarCollapsed && !mobileMenuOpen
                      ? "Cerrar Sesión"
                      : undefined
                  }
                >
                  <div className="flex-shrink-0">
                    <LogOut size={20} />
                  </div>
                  {(!sidebarCollapsed || mobileMenuOpen) && (
                    <span className="ml-3 font-medium">Cerrar Sesión</span>
                  )}
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Botón hamburger para móvil */}
                <button
                  title='Menu'
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Menu size={20} />
                </button>

                <div>
                  <ArrowLeft 
                    size={25} 
                    className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer" 
                    onClick={() => navigate(-1)}
                  />
                </div>

                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                    {getPageTitleFromPath(location.pathname) || "Página no encontrada"}
                  </h2>
                  <p className="text-xs md:text-sm text-gray-500 mt-1">
                    {new Date().toLocaleDateString("es-MX", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 md:space-x-4">
                <div className="text-right">
                  <span className="text-xs md:text-sm text-gray-600 truncate max-w-[150px] md:max-w-none block">
                    {user?.email}
                  </span>
                  <span className="text-xs text-gray-500 block">
                    {userRole}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Contenido */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>

        {/* Modal de confirmación de logout */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                ¿Estás seguro de que deseas cerrar sesión?
              </h3>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={logoutLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  disabled={logoutLoading}
                >
                  {logoutLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Cerrando sesión...</span>
                    </>
                  ) : (
                    <span>Cerrar Sesión</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AppLayout;
