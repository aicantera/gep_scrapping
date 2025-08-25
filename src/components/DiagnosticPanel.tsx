import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { testSupabaseConnection, testAuthConnection, supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle, RefreshCw, Wifi } from 'lucide-react'

export const DiagnosticPanel: React.FC = () => {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (test: string, success: boolean, message: string, details?: any) => {
    setResults(prev => [...prev, {
      test,
      success,
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    }])
  }

  const runDiagnostics = async () => {
    setLoading(true)
    setResults([])

    try {
      // Test 1: Verificar configuración básica
      addResult('Configuración', true, 'Cliente de Supabase inicializado correctamente')

      // Test 2: Probar conexión general
      const connectionTest = await testSupabaseConnection()
      addResult(
        'Conexión General',
        connectionTest.success,
        connectionTest.message,
        connectionTest.error
      )

      // Test 3: Probar sistema de autenticación
      const authTest = await testAuthConnection()
      addResult(
        'Sistema de Auth',
        authTest.success,
        authTest.message,
        authTest.error
      )

      // Test 4: Intentar una operación de autenticación simple
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          addResult('Sesión Actual', false, `Error al obtener sesión: ${error.message}`, error)
        } else {
          addResult('Sesión Actual', true, `Sesión obtenida correctamente. Usuario: ${data.session ? data.session.user.email : 'No hay sesión activa'}`)
        }
      } catch (err: any) {
        addResult('Sesión Actual', false, `Error inesperado: ${err.message}`, err)
      }

      // Test 5: Verificar URL y formato de clave
      const url = 'https://masterd.gepdigital.ai'
      const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey AgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
      
      // Verificar formato de JWT
      const jwtParts = key.split('.')
      if (jwtParts.length === 3) {
        try {
          const payload = JSON.parse(atob(jwtParts[1]))
          addResult('Formato JWT', true, `Clave válida. Rol: ${payload.role}, Expira: ${new Date(payload.exp * 1000).toLocaleDateString()}`, payload)
        } catch {
          addResult('Formato JWT', false, 'Error al decodificar JWT')
        }
      } else {
        addResult('Formato JWT', false, 'Formato de JWT inválido')
      }

      // Test 6: Verificar conectividad de red específica para self-hosted
      try {
        const response = await fetch(url + '/health')
        addResult('Conectividad de Red', response.ok, `Self-hosted server responde: ${response.status} ${response.statusText}`)
      } catch (err: unknown) {
        const error = err as Error
        addResult('Conectividad de Red', false, `Error de red: ${error.message}`, error)
      }

      // Test 7: Verificar endpoints específicos de Supabase
      try {
        const restEndpoint = await fetch(url + '/rest/v1/')
        addResult('REST API Endpoint', restEndpoint.status < 500, `REST API: ${restEndpoint.status} ${restEndpoint.statusText}`)
      } catch (err: unknown) {
        const error = err as Error
        addResult('REST API Endpoint', false, `REST API no accesible: ${error.message}`)
      }

    } catch (error: any) {
      addResult('Error General', false, `Error inesperado durante diagnóstico: ${error.message}`, error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Wifi className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Diagnóstico de Supabase</h2>
        </div>
        <Button 
          onClick={runDiagnostics} 
          disabled={loading}
          className="flex items-center space-x-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Ejecutando...</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              <span>Ejecutar Diagnóstico</span>
            </>
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Resultados:</h3>
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                result.success
                  ? 'bg-green-50 border-green-400'
                  : 'bg-red-50 border-red-400'
              }`}
            >
              <div className="flex items-center space-x-3">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.test}
                    </h4>
                    <span className="text-sm text-gray-500">{result.timestamp}</span>
                  </div>
                  <p className={`text-sm ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.message}
                  </p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer">
                        Ver detalles técnicos
                      </summary>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Wifi className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Haz clic en "Ejecutar Diagnóstico" para probar la conexión con Supabase</p>
        </div>
      )}
    </div>
  )
} 