import React, { useMemo } from 'react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Users,
  BarChart3,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  AlertTriangle,
  Building2,
  UserCog,
  Tag,
  Bot
} from 'lucide-react'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

// Mapeo de módulos a iconos y rutas
const moduleConfig = {
  'dashboard': { icon: Home, href: '/', label: 'Dashboard' },
  'documents': { icon: FileText, href: '/documentos', label: 'Gestión Documental' },
  'alerts': { icon: AlertTriangle, href: '/alertas', label: 'Alertas y Monitoreo' },
  'clients': { icon: Users, href: '/clientes', label: 'Gestión de Clientes' },
  'companies': { icon: Building2, href: '/empresas', label: 'Gestión de Empresas' },
  'themes': { icon: Tag, href: '/temas', label: 'Gestión de Temas' },
  'users': { icon: UserCog, href: '/usuarios', label: 'Gestión de Usuarios' },
  'bots': { icon: Bot, href: '/bots', label: 'Ejecución de Bots' }
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, userRole, signOut, allowedModules } = useAuth()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
  }

  // Generar menú dinámico basado en permisos del usuario
  const menuItems = useMemo(() => {
    return allowedModules
      .filter(module => moduleConfig[module as keyof typeof moduleConfig])
      .map(module => {
        const config = moduleConfig[module as keyof typeof moduleConfig]
        return {
          module,
          icon: config.icon,
          label: config.label,
          href: config.href
        }
      })
  }, [allowedModules])

  const isAdmin = userRole === 'Administrador'

  return (
    <div
      className={cn(
        'fixed left-0 top-0 z-40 flex flex-col h-screen bg-gradient-to-b from-slate-900 to-slate-800 shadow-xl transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!isCollapsed && (
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-[#999996] rounded-lg flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-white hover:bg-slate-700 h-8 w-8"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {/* Menú principal dinámico basado en permisos */}
        {menuItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center w-full px-3 py-2 rounded text-left text-slate-300 hover:text-white hover:bg-[#A1A3A5]/70 transition-colors duration-200',
              location.pathname === item.href && 'bg-[#D4133D] text-white',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <item.icon className={cn('h-5 w-5', isCollapsed ? '' : 'mr-3')} />
            {!isCollapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </Link>
        ))}

        {/* Botón de Cerrar Sesión - Justo después del menú */}
        <div className="pt-4 border-t border-slate-700">
          {!isCollapsed ? (
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full flex items-center px-3 py-2 text-slate-300 hover:text-white hover:bg-red-600/20 hover:border-red-500/30 transition-all duration-200 rounded"
            >
              <LogOut className="h-4 w-4 mr-3" />
              <span className="text-sm">Cerrar Sesión</span>
            </Button>
          ) : (
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="icon"
              className="w-full text-slate-300 hover:text-white hover:bg-red-600/20 transition-all duration-200 justify-center px-2 py-2 rounded"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Mensaje informativo sobre permisos */}
        {!isAdmin && !isCollapsed && (
          <div className="mt-6 text-xs text-slate-500 px-3">
            <div className="flex items-center space-x-2">
              <User className="h-3 w-3" />
              <span>Rol: {userRole}</span>
            </div>
            <div className="mt-1 text-slate-600">
              {menuItems.length} módulos disponibles
            </div>
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-t border-slate-700 p-4">
        <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'space-x-3')}>
          <div className="w-12 h-12 bg-[#999996] rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.email || 'Usuario'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {userRole || 'Sin rol asignado'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 