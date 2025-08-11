import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react'
import logoNegro from '../assets/images/logonegro.jpg'

interface LoginFormProps {
  onLogin: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  // Actualizar título del documento para la página de login
  useEffect(() => {
    document.title = 'Iniciar Sesión | GEP - Sistema de Gestión Empresarial'
    
    // Cleanup: restaurar título original al desmontar
    return () => {
      document.title = 'GEP - Sistema de Gestión Empresarial'
    }
  }, [])

  const validateEmail = (email: string): string | null => {
    if (!email) {
      return 'El campo correo electrónico es obligatorio.'
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return 'Formato de correo electrónico inválido.'
    }
    
    if (!email.endsWith('@gep.com.mx')) {
      return 'Solo se permiten correos empresariales de GEP (@gep.com.mx)'
    }
    
    return null
  }

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return 'El campo contraseña es obligatorio.'
    }
    return null
  }

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {}
    
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    
    if (emailError) newErrors.email = emailError
    if (passwordError) newErrors.password = passwordError
    
    if (!email && !password) {
      newErrors.general = 'Complete todos los campos requeridos para iniciar sesión.'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    setError(null)

    try {
      const result = await signIn(email.trim(), password)

      if (!result.success) {
        if (result.error === 'El usuario no está registrado en la plataforma. Verifique sus datos o contacte al administrador.') {
          setErrors({ general: result.error })
          setPassword('')
        } else if (result.error === 'Contraseña incorrecta. Intente nuevamente.') {
          setErrors({ password: result.error })
          setPassword('')
        } else if (result.error?.includes('inactiva') || result.error?.includes('desactivada')) {
          setErrors({ general: result.error })
        } else {
          setError('Error de autenticación. Contacte al administrador si el problema persiste.')
        }
        return
      }

      onLogin()
    } catch (err) {
      console.error('Error inesperado:', err)
      setError('Error de conexión. Verifique su internet e intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="flex items-center justify-center mx-auto mb-6">
            <img 
              src={logoNegro} 
              alt="GEP Logo" 
              className="w-32 h-32 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Bienvenido a GEP
          </h1>
          <p className="text-blue-100">
            Plataforma de Información Estratégica
          </p>
        </div>

        {/* Form */}
        <div className="login-form">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* General Error o Error de Contraseña */}
            {(errors.general || errors.password || error) && (
              <div className="error-message bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-center font-semibold">
                {errors.general || errors.password || error}
              </div>
            )}

            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">
                Correo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  placeholder="usuario@gep.com.mx"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email || errors.general) {
                      setErrors(prev => {
                        const newErrors = {...prev}
                        delete newErrors.email
                        delete newErrors.general
                        return newErrors
                      })
                    }
                  }}
                  className={`form-input pl-10 ${
                    errors.email 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : ''
                  }`}
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label">
                Contraseña
              </label>
              {errors.password && (
                <div className="error-message bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-2 text-center font-semibold">
                  {errors.password}
                </div>
              )}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: '' }))
                    }
                  }}
                  className={`form-input pl-10 ${
                    errors.password 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : ''
                  }`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="login-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>

            {/* Forgot Password */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                ¿Problemas para acceder?
              </p>
              <p className="text-xs text-gray-500">
                Contacte al administrador del sistema para restablecer su contraseña
              </p>
            </div>
          </form>

          {/* Security Info */}
          <div className="security-info mt-6">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900 text-sm mb-1">
                  Acceso Seguro
                </h3>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Solo personal autorizado de GEP puede acceder a esta plataforma. 
                  Su sesión está protegida con cifrado de extremo a extremo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 