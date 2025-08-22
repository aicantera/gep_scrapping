import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const SessionWarning: React.FC = () => {
  const { user, signOut } = useAuth()
  const [showWarning, setShowWarning] = useState<boolean>(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  useEffect(() => {
    if (!user) return

    const checkSessionTimeout = () => {
      // Simular el tiempo restante basado en la actividad del usuario
      // En una implementación real, esto vendría del AuthContext
      const lastActivity = localStorage.getItem('lastActivity')
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity)
        const sessionTimeout = 30 * 60 * 1000 // 30 minutos
        const remaining = Math.max(0, sessionTimeout - timeSinceLastActivity)
        
        setTimeRemaining(Math.floor(remaining / 1000))
        
        // Mostrar advertencia cuando queden 5 minutos
        if (remaining <= 5 * 60 * 1000 && remaining > 0) {
          setShowWarning(true)
        } else {
          setShowWarning(false)
        }
      }
    }

    const interval = setInterval(checkSessionTimeout, 1000)
    checkSessionTimeout() // Verificar inmediatamente

    return () => clearInterval(interval)
  }, [user])

  const handleExtendSession = () => {
    // Simular extensión de sesión
    localStorage.setItem('lastActivity', Date.now().toString())
    setShowWarning(false)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (!showWarning || !user) return null

  return (
    <div className="fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg 
            className="w-6 h-6 text-yellow-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Sesión próxima a expirar
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            Tu sesión expirará en {formatTime(timeRemaining)} minutos por inactividad.
          </p>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleExtendSession}
              className="px-3 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200 transition-colors"
            >
              Mantener sesión
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowWarning(false)}
          className="flex-shrink-0 text-yellow-400 hover:text-yellow-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default SessionWarning
