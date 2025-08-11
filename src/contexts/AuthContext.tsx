import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserRole = 'Administrador' | 'Analista GEP'

export interface UserProfile extends User {
  role?: UserRole
  activo?: boolean
  nombre?: string
  apellido?: string
}

interface AuthContextType {
  user: UserProfile | null
  userRole: UserRole | null
  loading: boolean
  connectionStatus: 'connecting' | 'connected' | 'error'
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  hasAccess: (module: string) => boolean
  allowedModules: string[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Definición de permisos por rol
const rolePermissions: Record<UserRole, string[]> = {
  'Administrador': [
    'dashboard',
    'documents', 
    'alerts',
    'clients',
    'companies',
    'themes',
    'users',
    'bots'
  ],
  'Analista GEP': [
    'dashboard',
    'documents',
    'alerts',
    'bots'
  ]
}

// Mapeo de módulos para display
export const moduleLabels: Record<string, string> = {
  'dashboard': 'Dashboard',
  'documents': 'Gestión Documental',
  'alerts': 'Alertas y Monitoreo',
  'clients': 'Gestión de Clientes',
  'companies': 'Gestión de Empresas',
  'themes': 'Gestión de Temas',
  'users': 'Gestión de Usuarios',
  'bots': 'Ejecución de Bots'
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')

  // Función para obtener información del usuario desde la tabla usuarios
  const getUserInfo = async (email: string): Promise<{ role: UserRole; activo: boolean; nombre?: string; apellido?: string } | null> => {
    try {
      console.log('🔍 getUserInfo para:', email)
      // Timeout de 5 segundos para la consulta
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout en getUserInfo')), 5000)
      )
      const queryPromise = supabase
        .from('usuarios')
        .select('perfil, activo, nombre, apellido')
        .eq('email', email.toLowerCase())
        .single()
      interface SupabaseResponse {
        data: { perfil: string; activo: boolean; nombre?: string; apellido?: string } | null;
        error: { message: string } | null;
      }
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as SupabaseResponse
      console.log('📊 Resultado getUserInfo:', { data, error: error?.message })
      if (error || !data) {
        console.log('⚠️ Usuario no encontrado en la tabla usuarios, retornando null')
        return null
      }
      const result = {
        role: data.perfil as UserRole,
        // Si el campo activo no existe, asumimos que está activo
        activo: data.activo !== undefined ? data.activo : true,
        nombre: data.nombre,
        apellido: data.apellido
      }
      console.log('✅ getUserInfo exitoso:', result)
      return result
    } catch (error) {
      console.error('❌ Error obteniendo información del usuario:', error)
      // Fallback en caso de error
      const defaultRole: UserRole = (email.includes('admin') || email.includes('administrador')) 
        ? 'Administrador' 
        : 'Analista GEP'
      const fallbackResult = { role: defaultRole, activo: true }
      console.log('🔄 Usando fallback:', fallbackResult)
      return fallbackResult
    }
  }

  // Verificar si el usuario tiene acceso a un módulo
  const hasAccess = (module: string): boolean => {
    if (!userRole) return false
    return rolePermissions[userRole]?.includes(module) || false
  }

  // Obtener módulos permitidos para el rol actual
  const getAllowedModules = (): string[] => {
    if (!userRole) return []
    return rolePermissions[userRole] || []
  }

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const initializeAuth = async () => {
      try {
        console.log('🔄 Iniciando AuthContext...')
        setConnectionStatus('connecting')
        // Timeout de seguridad de 15 segundos
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.error('⏰ Timeout: La inicialización tardó demasiado')
            setConnectionStatus('error')
            setLoading(false)
          }
        }, 15000)
        console.log('🔍 Verificando sesión existente...')
        // Verificar conexión con Supabase
        const { data, error } = await supabase.auth.getSession()
        console.log('📊 Resultado getSession:', { 
          hasData: !!data, 
          hasSession: !!data?.session, 
          hasUser: !!data?.session?.user,
          error: error?.message 
        })
        if (error) {
          console.error('❌ Error al obtener sesión:', error)
          setConnectionStatus('error')
          return
        }
        setConnectionStatus('connected')
        console.log('✅ Conexión establecida')
        if (data.session?.user && isMounted) {
          console.log('👤 Usuario encontrado en sesión:', data.session.user.email)
          try {
            console.log('🔍 Obteniendo información del usuario...')
            const userInfo = await getUserInfo(data.session.user.email || '')
            console.log('📊 Info del usuario obtenida:', userInfo)
            if (userInfo && !userInfo.activo) {
              console.log('⚠️ Usuario inactivo detectado, cerrando sesión')
              await supabase.auth.signOut()
              setUser(null)
              setUserRole(null)
              return
            }
            const userWithRole: UserProfile = {
              ...data.session.user,
              role: userInfo?.role || 'Analista GEP',
              activo: userInfo?.activo ?? true,
              nombre: userInfo?.nombre,
              apellido: userInfo?.apellido
            }
            console.log('✅ Usuario configurado con rol:', userWithRole.role)
            setUser(userWithRole)
            setUserRole(userWithRole.role || null)
          } catch (userError) {
            console.error('❌ Error obteniendo info del usuario:', userError)
            // En caso de error, usar valores por defecto
            const defaultUserWithRole: UserProfile = {
              ...data.session.user,
              role: 'Analista GEP',
              activo: true
            }
            setUser(defaultUserWithRole)
            setUserRole('Analista GEP')
          }
        } else {
          console.log('👤 No hay sesión activa')
          setUser(null)
          setUserRole(null)
        }
      } catch (error) {
        console.error('❌ Error general de conexión:', error)
        if (isMounted) {
          setConnectionStatus('error')
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        if (isMounted) {
          console.log('🏁 Finalizando inicialización, setLoading(false)')
          setLoading(false)
        }
      }
    }

    console.log('🚀 Ejecutando initializeAuth...')
    initializeAuth()

    // Escuchar cambios de autenticación
    console.log('👂 Configurando listener de auth...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        console.log('🔔 Auth state change:', event, !!session?.user)
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          // En cada refresh de token o login, garantizamos que user/rol sigan válidos
          const userInfo = await getUserInfo(session.user.email || '')
          if (userInfo && !userInfo.activo) {
            console.log('⚠️ Usuario inactivo intentando mantener sesión, cerrando')
            await supabase.auth.signOut()
            setUser(null)
            setUserRole(null)
            return
          }
          const userWithRole: UserProfile = {
            ...session.user,
            role: userInfo?.role || 'Analista GEP',
            activo: userInfo?.activo ?? true,
            nombre: userInfo?.nombre,
            apellido: userInfo?.apellido
          }
          setUser(userWithRole)
          setUserRole(userWithRole.role || null)
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 Usuario cerrando sesión')
          setUser(null)
          setUserRole(null)
        }
        setLoading(false)
      }
    )

    return () => {
      console.log('🧹 Limpiando AuthContext...')
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      subscription.unsubscribe()
    }
  }, [])

  // Keep-alive/auto-refresh defensivo: cada 4 minutos y al volver al foco
  useEffect(() => {
    let cancelled = false

    const ensureSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!data?.session) {
          // Intentar refrescar; si no hay sesión válida, cerrar completamente
          try {
            const { data: refreshed } = await supabase.auth.refreshSession()
            if (!refreshed?.session && !cancelled) {
              await supabase.auth.signOut()
              setUser(null)
              setUserRole(null)
            }
          } catch {
            if (!cancelled) {
              await supabase.auth.signOut()
              setUser(null)
              setUserRole(null)
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Error verificando sesión, forzando cierre seguro:', e)
        if (!cancelled) {
          await supabase.auth.signOut()
          setUser(null)
          setUserRole(null)
        }
      }
    }

    const intervalId = setInterval(ensureSession, 4 * 60 * 1000) // 4 min
    const onFocus = () => ensureSession()
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      // Importante: no tocar el loading global aquí para no desmontar el LoginForm
      // Verificar si el usuario existe y está activo antes de intentar el login
      const userInfo = await getUserInfo(email.trim())
      if (!userInfo) {
        return {
          success: false,
          error: 'El usuario no está registrado en la plataforma. Verifique sus datos o contacte al administrador.'
        }
      }
      if (userInfo && !userInfo.activo) {
        return { 
          success: false, 
          error: 'Tu cuenta está inactiva. Contacta al administrador del sistema.' 
        }
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })
      if (error) {
        // Si el usuario existe pero la contraseña es incorrecta
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
          return {
            success: false,
            error: 'Contraseña incorrecta. Intente nuevamente.'
          }
        }
        return { 
          success: false, 
          error: error.message 
        }
      }
      if (data.user) {
        // Volver a verificar el estado después del login exitoso
        const finalUserInfo = await getUserInfo(data.user.email || '')
        if (finalUserInfo && !finalUserInfo.activo) {
          // Si por alguna razón el usuario fue desactivado durante el proceso de login
          await supabase.auth.signOut()
          return { 
            success: false, 
            error: 'Tu cuenta fue desactivada. Contacta al administrador del sistema.' 
          }
        }
        const userWithRole: UserProfile = {
          ...data.user,
          role: finalUserInfo?.role || 'Analista GEP',
          activo: finalUserInfo?.activo ?? true,
          nombre: finalUserInfo?.nombre,
          apellido: finalUserInfo?.apellido
        }
        setUser(userWithRole)
        setUserRole(userWithRole.role || null)
      }
      return { success: true }
    } catch {
      return { 
        success: false, 
        error: 'Error de conexión. Verifique su internet e intente nuevamente.' 
      }
    } finally {
      // No modificar loading global
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error al cerrar sesión:', error)
      }
      setUser(null)
      setUserRole(null)
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    userRole,
    loading,
    connectionStatus,
    signIn,
    signOut,
    hasAccess,
    allowedModules: getAllowedModules()
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 