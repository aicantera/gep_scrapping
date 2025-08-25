import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface SessionTimerProps {
  className?: string
}

const SessionTimer: React.FC<SessionTimerProps> = ({ className = '' }) => {
  const { user } = useAuth()
  const [timeRemaining, setTimeRemaining] = useState<number>(30 * 60) // 30 minutos en segundos
  const [showWarning, setShowWarning] = useState<boolean>(false)

  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1
        
        // Mostrar advertencia cuando queden 5 minutos
        if (newTime <= 5 * 60 && newTime > 0) {
          setShowWarning(true)
        }
        
        // Ocultar advertencia cuando se reinicie la sesión
        if (newTime > 5 * 60) {
          setShowWarning(false)
        }
        
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [user])

  // Reiniciar el timer cuando el usuario haga actividad
  useEffect(() => {
    if (!user) return

    const resetTimer = () => {
      setTimeRemaining(30 * 60)
      setShowWarning(false)
    }

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimer, true)
    })

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetTimer, true)
      })
    }
  }, [user])

  if (!user) return null

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getTimeColor = (): string => {
    if (timeRemaining <= 2 * 60) return 'text-red-500' // Rojo cuando quedan 2 minutos o menos
    if (timeRemaining <= 5 * 60) return 'text-yellow-500' // Amarillo cuando quedan 5 minutos o menos
    return 'text-green-500' // Verde por defecto
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <svg 
          className="w-4 h-4 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <span className={`text-xs font-mono ${getTimeColor()}`}>
          {formatTime(timeRemaining)}
        </span>
      </div>
      
      {showWarning && (
        <div className="flex items-center space-x-1">
          <svg 
            className="w-4 h-4 text-yellow-500" 
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
          <span className="text-xs text-yellow-600">
            Sesión expira pronto
          </span>
        </div>
      )}
    </div>
  )
}

export default SessionTimer
