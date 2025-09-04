import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-toastify'
import { ESTATUS_DOC_OPTIONS } from '@/utils/SelectOptions'

interface Alert {
  id_alerta: number
  nombre_cliente: string
  created_at: string
  temas_subtemas: string[]
  emailsCount: number
  estado: string
  fuente: string | null
  documento_senado: Document | null
  listas_distribucion: Array<{correo: string, nombre: string}>
  datetime_enviado_correo: string | null
  link_pdf_enviado: string | null
  enviado_por: {
    nombre: string
    apellido: string
    email: string
  } | null
}

interface Document {
  id_senado_doc: number
  titulo: string
  tipo: string
  fuente: string
  dependencia: string
  temas: string
  resumen: string
  objeto: string
  analisis: string
  sinopsis: string
  correspondiente: string
  transitorios: string
  Proponente: string
  personas: string
  analizado: boolean
  informacion_adicional: string
  link_iniciativa: string
  gaceta: string
  iniciativa_id: string
  partidos: string
  leyes: string
  created_at: string
}

const AlertView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [alert, setAlert] = useState<Alert | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Source and document type constants
  const sources = ["Cámara de Diputados", "Cámara de Senadores", "Diario Oficial de la Federación"]
  const docTypes = ["INICIATIVA", "PUNTO DE ACUERDO"]

  useEffect(() => {
    fetchAlert()
  }, [id])

  const fetchAlert = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('alertas_directorio')
        .select(`
          *,
          documento_senado:senado(*),
          listas_distribucion:lista_distribucion_alertas(correo, nombre),
          enviado_por:usuarios(nombre, apellido, email)
        `)
        .eq('id_alerta', parseInt(id))
        .single()

      if (error) throw error
      
      setAlert(data)
      console.log(data)
    } catch (error) {
      console.error('Error fetching alert:', error)
      setError('Error al cargar la alerta')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#D4133D]"></div>
          <p className="mt-4 text-gray-600">Cargando alerta...</p>
        </div>
      </div>
    )
  }

  if (error || !alert) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Alerta no encontrada'}</p>
          <button
            onClick={() => navigate('/gestion-alertas')}
            className="px-4 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] transition-colors"
          >
            Volver a Gestión de Alertas
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Detalle de Alerta Enviada
              </h1>
            </div>
            <span className={`rounded-xl py-1 px-3 text-sm ${
              alert.estado === 'pendientes' ? 'bg-yellow-100 text-yellow-800' :
              alert.estado === 'enviadas' ? 'bg-green-100 text-green-800' :
              alert.estado === 'rechazadas' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {alert.estado}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 space-y-6">
            {/* Información básica de la alerta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                <div className="text-gray-900 font-medium">{alert.nombre_cliente}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ID Alerta</label>
                <div className="text-gray-900">#{alert.id_alerta}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de Creación</label>
                <div className="text-gray-900">
                  {new Date(alert.created_at).toLocaleDateString('es-MX')}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Estado</label>
                <div className="text-gray-900">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    alert.estado === 'pendientes' ? 'bg-yellow-100 text-yellow-800' :
                    alert.estado === 'enviadas' ? 'bg-green-100 text-green-800' :
                    alert.estado === 'rechazadas' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {alert.estado}
                  </span>
                </div>
              </div>
              {alert.datetime_enviado_correo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Envío</label>
                  <div className="text-gray-900">
                    {new Date(alert.datetime_enviado_correo).toLocaleDateString('es-MX')}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Fuente</label>
                <div className="text-gray-900">{alert.fuente || 'N/A'}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Enviado por:</label>
                <div className="text-gray-900">
                  {`${alert?.enviado_por?.nombre || 'N/A'} ${alert?.enviado_por?.apellido || 'N/A'}`}
                </div>
                <div className="text-gray-900">{alert?.enviado_por?.email || 'N/A'}</div>
              </div>
            </div>

            {/* Temas y Subtemas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Temas y Subtemas</label>
              <div className="flex flex-wrap gap-2">
                {(alert.temas_subtemas && alert.temas_subtemas.length > 0) ? (
                  alert.temas_subtemas.map((tema, index) => (
                    <span
                      key={index}
                      className="inline-flex px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                    >
                      {tema}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm italic">Sin temas asignados</span>
                )}
              </div>
            </div>

            {/* Información del Documento del Senado */}
            {alert.documento_senado && (
              <div className="border-t pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  📄 Documento de Fuente de Extracción
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Título */}
                  {alert.documento_senado.titulo && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Título</label>
                      <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                        {alert.documento_senado.titulo}
                      </div>
                    </div>
                  )}

                  {/* Tipo de Proyecto - Solo mostrar si no es DOF */}
                  {alert.documento_senado.fuente !== sources[2] && alert.documento_senado.tipo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tipo de Proyecto</label>
                      <div className="text-gray-900">
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          {alert.documento_senado.tipo}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Proponente - Solo mostrar si no es DOF */}
                  {alert.documento_senado.fuente !== sources[2] && (alert.documento_senado.Proponente || alert.documento_senado.personas) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Proponente</label>
                      <div className="text-gray-900 font-medium">{alert.documento_senado.Proponente || alert.documento_senado.personas}</div>
                    </div>
                  )}

                  {/* Cámara de origen / Órgano de difusión */}
                  {alert.documento_senado.fuente && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {alert.documento_senado.fuente === sources[2] ? "Órgano de difusión" : "Cámara de origen"}
                      </label>
                      <div className="text-gray-900 font-medium">{alert.documento_senado.fuente}</div>
                    </div>
                  )}

                  {/* Dependencia - Solo mostrar si es DOF */}
                  {alert.documento_senado.fuente === sources[2] && alert.documento_senado.dependencia && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Dependencia</label>
                      <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                        {alert.documento_senado.dependencia}
                      </div>
                    </div>
                  )}

                  {/* Temas/Subtemas */}
                  {alert.documento_senado.temas && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Temas/Subtemas</label>
                      <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                        {alert.documento_senado.temas}
                      </div>
                    </div>
                  )}

                  {/* Objeto o Resumen según fuente */}
                  {alert.documento_senado.fuente === sources[2] ? (
                    alert.documento_senado.resumen && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Resumen</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alert.documento_senado.resumen}
                        </div>
                      </div>
                    )
                  ) : (
                    alert.documento_senado.objeto && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Objeto</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alert.documento_senado.objeto}
                        </div>
                      </div>
                    )
                  )}

                  {/* Análisis o Correspondiente según fuente */}
                  {alert.documento_senado.fuente === sources[2] || ((alert.documento_senado.fuente === sources[0] || alert.documento_senado.fuente === sources[1]) && (alert.documento_senado.tipo === docTypes[0] || alert.documento_senado.tipo === docTypes[1])) ? (
                    alert.documento_senado.analisis && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Análisis</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alert.documento_senado.analisis}
                        </div>
                      </div>
                    )
                  ) : (
                    alert.documento_senado.correspondiente && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Correspondiente</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alert.documento_senado.correspondiente}
                        </div>
                      </div>
                    )
                  )}

                  {/* Transitorios - Solo para fuentes que no sean DOF y tipos que no sean PUNTO DE ACUERDO */}
                  {alert.documento_senado.fuente !== sources[2] && alert.documento_senado.tipo !== docTypes[0] && alert.documento_senado.transitorios && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Transitorios</label>
                      <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                        {alert.documento_senado.transitorios}
                      </div>
                    </div>
                  )}

                  {/* Estatus - Solo mostrar si no es DOF */}
                  {(alert.documento_senado.fuente !== sources[2] && alert.documento_senado.resumen) && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Estatus</label>
                      <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                        {(() => {
                          const resumen = alert.documento_senado?.resumen;
                          if (!resumen) return '';
                          const matchedStatus = ESTATUS_DOC_OPTIONS.find(option => option.value === resumen);
                          return matchedStatus ? matchedStatus.label : resumen;
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Información adicional - Solo para tipos específicos con fuentes de Cámaras */}
                  {((alert.documento_senado.tipo === docTypes[0] || alert.documento_senado.tipo === docTypes[1]) && (alert.documento_senado.fuente === sources[0] || alert.documento_senado.fuente === sources[1])) && alert.documento_senado.informacion_adicional && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Información adicional</label>
                      <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                        {alert.documento_senado.informacion_adicional}
                      </div>
                    </div>
                  )}

                  {/* Enlaces adicionales */}
                  {alert.documento_senado.link_iniciativa && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Enlace Iniciativa</label>
                      <div className="mt-1">
                        <a 
                          href={alert.documento_senado.link_iniciativa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          Ver documento original
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Campos adicionales */}
                  {alert.documento_senado.gaceta && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Gaceta</label>
                      <div className="text-gray-900">{alert.documento_senado.gaceta}</div>
                    </div>
                  )}

                  {alert.documento_senado.iniciativa_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ID de Iniciativa</label>
                      <div className="text-gray-900">
                        <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {alert.documento_senado.iniciativa_id}
                        </span>
                      </div>
                    </div>
                  )}

                  {alert.documento_senado.partidos && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Partidos</label>
                      <div className="text-gray-900">{alert.documento_senado.partidos}</div>
                    </div>
                  )}

                  {alert.documento_senado.leyes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Leyes</label>
                      <div className="text-gray-900">{alert.documento_senado.leyes}</div>
                    </div>
                  )}

                  {/* Fecha de Creación del Documento */}
                  {alert.documento_senado.created_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha de Creación del Documento</label>
                      <div className="text-gray-900">
                        {new Date(alert.documento_senado.created_at).toLocaleDateString('es-MX')}
                      </div>
                    </div>
                  )}

                  {/* Estado de análisis */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Estado de Análisis</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        alert.documento_senado.analizado 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.documento_senado.analizado ? 'Analizado' : 'Pendiente de análisis'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              {alert.link_pdf_enviado && (
                <a
                  href={alert.link_pdf_enviado}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] transition-colors"
                >
                  <Download size={16} />
                  Descargar PDF
                </a>
              )}
              <button
                type="button"
                onClick={() => navigate('/gestion-alertas')}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlertView
