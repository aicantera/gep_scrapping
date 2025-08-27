import React, { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredModule?: string
  onUnauthorized?: () => void
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredModule, 
  onUnauthorized 
}) => {
  const { user, hasAccess, loading } = useAuth()

  useEffect(() => {
    // Si el usuario no está autenticado, redirigir al login (se maneja en App.tsx)
    if (!loading && !user) {
      return
    }

    // Si se requiere un módulo específico y el usuario no tiene acceso
    if (!loading && user && requiredModule && !hasAccess(requiredModule)) {
      if (onUnauthorized) {
        onUnauthorized()
      }
    }
  }, [user, loading, hasAccess, requiredModule, onUnauthorized])

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, no mostrar contenido (será redirigido por App.tsx)
  if (!user) {
    return null
  }

  // Si se requiere un módulo específico y no tiene acceso, mostrar mensaje de error
  if (requiredModule && !hasAccess(requiredModule)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Acceso Denegado
          </h3>
          <p className="text-gray-600 mb-6">
            No tienes permisos para acceder a este módulo. Contacta al administrador si necesitas acceso.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute 