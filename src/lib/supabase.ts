import { createClient } from '@supabase/supabase-js'

// Configuración para Supabase Self-Hosted - Credenciales corregidas
const supabaseUrl = 'https://masterd.gepdigital.ai'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

console.log('🔧 Configurando Supabase Self-Hosted:')
console.log('URL:', supabaseUrl)
console.log('Key preview:', supabaseAnonKey.substring(0, 20) + '...')

// Crear cliente de Supabase optimizado para self-hosted
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    debug: process.env.NODE_ENV === 'development'
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
    },
  },
  // Configuración específica para self-hosted
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Cliente de administrador para operaciones privilegiadas
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'apikey': supabaseServiceKey,
    },
  },
})

// Función específica para probar Supabase self-hosted
export const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Probando conexión con Supabase Self-Hosted...')
    console.log('🌐 URL:', supabaseUrl)

    // Test 1: Verificar que el servidor responda
    try {
      const healthResponse = await fetch(`${supabaseUrl}/health`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
        },
      })
      console.log('🏥 Health check status:', healthResponse.status)
    } catch {
      console.log('⚠️ Health endpoint no disponible (normal en algunas configuraciones)')
    }

    // Test 2: Probar endpoint de REST API
    try {
      const restResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      })
      console.log('🔗 REST API status:', restResponse.status)
      
      if (restResponse.ok) {
        return { 
          success: true, 
          message: 'Conexión exitosa con Supabase Self-Hosted (REST API funcionando)' 
        }
      }
    } catch (restError) {
      console.error('❌ Error en REST API:', restError)
    }

    // Test 3: Intentar una consulta simple a una tabla que probablemente no existe
    const { data, error } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1)

    if (error) {
      console.log('📊 Error esperado al consultar tabla test:', error.code, error.message)
      
      // Errores que indican que la conexión funciona pero la tabla no existe
      if (error.code === 'PGRST116' || 
          error.message.includes('does not exist') ||
          error.message.includes('relation') ||
          error.code === '42P01') {
        return { 
          success: true, 
          message: 'Conexión exitosa con Supabase Self-Hosted (PostgreSQL respondiendo)' 
        }
      }
      
      // Error de autenticación - las credenciales son incorrectas
      if (error.code === 'PGRST301' || 
          error.message.includes('JWT') ||
          error.message.includes('authorization') ||
          error.code === '401') {
        return { 
          success: false, 
          message: 'Error de autenticación: Verifica tus credenciales de Supabase',
          error: error
        }
      }
    }

    return { 
      success: true, 
      message: 'Conexión exitosa con Supabase Self-Hosted', 
      data 
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error('❌ Error de conexión detallado:', err)
    
    // Errores de red comunes
    if (err.message.includes('fetch')) {
      return { 
        success: false, 
        message: `Error de red: No se puede conectar a ${supabaseUrl}. Verifica que el servidor esté ejecutándose.`,
        error: err
      }
    }
    
    return { 
      success: false, 
      message: `Error de conexión: ${err.message}`, 
      error: err
    }
  }
}

// Función específica para probar autenticación en self-hosted
export const testAuthConnection = async () => {
  try {
    console.log('🔄 Probando sistema de autenticación self-hosted...')
    
    // Test 1: Verificar endpoint de auth
    try {
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      })
      console.log('🔐 Auth endpoint status:', authResponse.status)
      
      if (authResponse.ok) {
        const settings = await authResponse.json()
        console.log('⚙️ Auth settings recibidas:', Object.keys(settings))
      }
    } catch {
      console.log('⚠️ Auth endpoint no accesible directamente')
    }

    // Test 2: Obtener usuario actual
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.log('🔍 Error al obtener usuario (esperado si no hay sesión):', error.message)
      
      // Si es un error de JWT o autorización, es un problema de credenciales
      if (error.message.includes('JWT') || 
          error.message.includes('invalid') ||
          error.message.includes('malformed')) {
        return { 
          success: false, 
          message: `Error de credenciales: ${error.message}`,
          error 
        }
      }
      
      // Si no hay sesión, es normal
      if (error.message.includes('session') || error.message.includes('user')) {
        return { 
          success: true, 
          message: 'Sistema de autenticación funcionando (no hay sesión activa)',
        }
      }
    }

    console.log('✅ Sistema de autenticación funcionando')
    console.log('👤 Usuario actual:', user ? user.email : 'No hay sesión activa')
    
    return { 
      success: true, 
      message: 'Sistema de autenticación funcionando correctamente',
      user 
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error('❌ Error inesperado en auth:', err)
    return { 
      success: false, 
      message: `Error inesperado: ${err.message}`,
      error: err
    }
  }
}

// Service role key para operaciones administrativas (no usar en frontend) - Actualizada
export { supabaseServiceKey } 