import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginForm } from './components/LoginForm'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import AlertsManagement from './components/AlertsManagement'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

const AppContent: React.FC = () => {
  const { user, loading, connectionStatus, userRole } = useAuth()

  // Mostrar pantalla de carga inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {connectionStatus === 'connecting' ? 'Conectando...' : 'Verificando sesión...'}
          </p>
        </div>
      </div>
    )
  }

  // Mostrar error de conexión
  if (connectionStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M6 20a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Error de Conexión
          </h3>
          <p className="text-gray-600 mb-6">
            No se pudo cargar el menú. Intenta recargar la página o contacta al administrador.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Recargar Página
          </button>
        </div>
      </div>
    )
  }

  // Mostrar error si no se puede determinar el rol del usuario
  if (user && !userRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Permisos No Disponibles
          </h3>
          <p className="text-gray-600 mb-6">
            Tus permisos han cambiado. Por favor, vuelve a iniciar sesión para aplicar los nuevos accesos.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reiniciar Sesión
          </button>
        </div>
      </div>
    )
  }

  // Si no hay usuario autenticado, mostrar login
  if (!user) {
    return <LoginForm onLogin={() => {}} />
  }

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/alertas" element={<ProtectedRoute><AlertsManagement /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
