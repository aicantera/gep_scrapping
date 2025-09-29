import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DocumentEditor } from './DocumentEditor'
import Select2 from './ui/select2'
import { ESTATUS_DOC_OPTIONS } from '@/utils/SelectOptions'

interface Alert {
  // Campos REALES de la tabla alertas_directorio
  id_alerta: number                    // bigint
  created_at: string                   // timestamp with time zone
  id_cliente: string                   // uuid
  status_alerta: boolean | null        // boolean nullable
  temas: string[] | null              // ARRAY nullable
  sub_tema: string[] | null           // ARRAY nullable
  fuente: string | null               // text nullable
  estado: string | null               // text nullable ('pendientes' | 'enviadas' | 'rechazadas')
  estado_documento: string | null     // text nullable (estatus del documento)
  id_doc_senado: number | null        // bigint nullable
  id_analista: string | null          // text nullable
  enviado_correo: boolean | null      // boolean nullable
  datetime_enviado_correo: string | null // timestamp nullable
  link_pdf_enviado?: string | null    // url del pdf enviado
  alerta_html?: string | null
  destinatarios?: string[] | null
  
  // Campos calculados/derivados para la UI
  nombre_cliente?: string
  temas_subtemas?: string[]
  listas_distribucion?: {
    nombre: string;
    correo: string;
  }[]
  
  // Datos del documento del senado (si existe relación FK)
  senado?: {
    sinopsis?: string
    Proponente?: string
    created_at?: string
    link_iniciativa?: string
    resumen?: string
    tipo?: string
    objeto?: string
    gaceta?: string
    iniciativa_texto?: string
    temas?: string
    personas?: string
    partidos?: string
    fuente?: string
    transitorios?: string
    dependencia?: string
    ultimo_doc_expediente?: string
    ver_expediente?: string
    analisis?: string
    analizado?: boolean
    informacion_adicional?: string
    link_documento?: string
    id_senado_doc?: number
    [key: string]: any // Para campos adicionales
    titulo?: string
    estado?: string | null
  } | null

  enviado_por?: any;
  emailsCount?: number;
  newEmailsList?: string[];
}

const AlertView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [alert, setAlert] = useState<Alert | null>(null)
  const [cliente, setCliente] = useState<any>(null)
  const [analista, setAnalista] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState<string>('')

  // Source and document type constants
  const sources = ["Cámara de Diputados", "Cámara de Senadores", "Diario Oficial de la Federación"]
  const docTypes = ["INICIATIVA", "PUNTO DE ACUERDO"]

  useEffect(() => {
    fetchAlert()
  }, [id])

  useEffect(() => {
    if(alert && alert.alerta_html && alert.alerta_html !== '') {
      setEditorContent(alert.alerta_html)
    } else if (alert && (!alert.alerta_html || alert.alerta_html === '') && alert.senado && alert.senado.documento_html && alert.senado.documento_html !== '') { 
      setEditorContent(alert.senado.documento_html)
    } else if (alert && (!alert.alerta_html || alert.alerta_html === '') && alert.senado && alert.senado.documento_html && alert.senado.documento_html === '') {
      const htmlContent = generateDocumentHTML(alert.senado)
      setEditorContent(htmlContent)
    }
  }, [alert])
  
  const generateDocumentHTML = (doc: any): string => {
    let html = ''
    
    // 1. DOF documents
    if (doc.fuente === sources[2]) {
      // Título
      if (doc.titulo) {
        html += `<h3>Título</h3>`
        html += `<p>${doc.titulo}</p>`
      }

      // Fuente (Órgano de difusión)
      if (doc.fuente) {
        html += `<h3>Fuente</h3>`
        html += `<p>${doc.fuente}</p>`
      }

      // Dependencia
      if (doc.dependencia) {
        html += `<h3>Dependencia</h3>`
        html += `<p>${doc.dependencia}</p>`
      }

      // Temas
      if (doc.temas) {
        html += `<h3>Temas</h3>`
        html += `<p>${doc.temas}</p>`
      }

      // Resumen
      if (doc.resumen) {
        html += `<h3>Resumen</h3>`
        html += `<p>${doc.resumen}</p>`
      }

      // Análisis
      if (doc.analisis) {
        html += `<h3>Análisis</h3>`
        html += `<p>${doc.analisis}</p>`
      }
    }
    // 2. INICIATIVAS (Diputados/Senadores)
    else if ((doc.fuente === sources[0] || doc.fuente === sources[1]) && doc.tipo === docTypes[0]) {
      // Tipo de Proyecto
      if (doc.tipo) {
        html += `<h3>Tipo de Proyecto</h3>`
        html += `<p>${doc.tipo}</p>`
      }

      // Título
      if (doc.titulo) {
        html += `<h3>Título</h3>`
        html += `<p>${doc.titulo}</p>`
      }

      // Cámara de origen (fuente)
      if (doc.fuente) {
        html += `<h3>Cámara de Origen</h3>`
        html += `<p>${doc.fuente}</p>`
      }

      // Proponente
      if (doc.Proponente) {
        html += `<h3>Proponente</h3>`
        html += `<p>${doc.Proponente}</p>`
      }

      // Temas
      if (doc.temas) {
        html += `<h3>Temas</h3>`
        html += `<p>${doc.temas}</p>`
      }

      // Objeto
      if (doc.objeto) {
        html += `<h3>Objeto</h3>`
        html += `<p>${doc.objeto}</p>`
      }

      // Análisis
      if (doc.analisis) {
        html += `<h3>Análisis</h3>`
        html += `<p>${doc.analisis}</p>`
      }

      // Transitorios
      if (doc.transitorios) {
        html += `<h3>Transitorios</h3>`
        html += `<p>${doc.transitorios}</p>`
      }
    }
    // 3. PUNTOS DE ACUERDO (Diputados/Senadores)
    else if ((doc.fuente === sources[0] || doc.fuente === sources[1]) && doc.tipo === docTypes[1]) {
      // Tipo de Proyecto
      if (doc.tipo) {
        html += `<h3>Tipo de Proyecto</h3>`
        html += `<p>${doc.tipo}</p>`
      }

      // Título
      if (doc.titulo) {
        html += `<h3>Título</h3>`
        html += `<p>${doc.titulo}</p>`
      }

      // Cámara de origen (fuente)
      if (doc.fuente) {
        html += `<h3>Cámara de Origen</h3>`
        html += `<p>${doc.fuente}</p>`
      }

      // Proponente
      if (doc.Proponente) {
        html += `<h3>Proponente</h3>`
        html += `<p>${doc.Proponente}</p>`
      }

      // Temas
      if (doc.temas) {
        html += `<h3>Temas</h3>`
        html += `<p>${doc.temas}</p>`
      }

      // Objeto
      if (doc.objeto) {
        html += `<h3>Objeto</h3>`
        html += `<p>${doc.objeto}</p>`
      }

      // Análisis
      if (doc.analisis) {
        html += `<h3>Análisis</h3>`
        html += `<p>${doc.analisis}</p>`
      }
    }

    return html
  }

  const fetchAlert = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const { data: alertaData, error } = await supabase
        .from('alertas_directorio')
        .select(`
          id_alerta,
          created_at,
          id_cliente,
          status_alerta,
          temas,
          sub_tema,
          fuente,
          estado,
          estado_documento,
          id_doc_senado,
          id_analista,
          enviado_correo,
          datetime_enviado_correo,
          link_pdf_enviado,
          alerta_html,
          destinatarios,
          clientes (
            nombre_cliente,
            siglas,
            email
          ),
          senado (
            fuente,
            dependencia,
            sinopsis,
            Proponente,
            created_at,
            link_iniciativa,
            resumen,
            tipo,
            objeto,
            gaceta,
            temas,
            personas,
            partidos,
            iniciativa_texto,
            iniciativa_id,
            imagen_link,
            leyes,
            analisis,
            transitorios,
            correspondiente,
            analizado,
            ultimo_doc_expediente,
            ver_expediente,
            informacion_adicional,
            titulo,
            link_documento,
            documento_html,
            id_senado_doc,
            estado
          )
        `)
        .eq('id_alerta', parseInt(id))
        .single();

      if (error) throw error
      
      if (alertaData?.id_analista) {
        const { data: userFilter } = await supabase
          .from('usuarios')
          .select("*")
          .eq('user_id', alertaData.id_analista)
          .single();
  
        setAnalista(userFilter);
      } 

      const { data: clienteData } = await supabase
      .from('clientes')
      .select("*")
      .eq('id_cliente', alertaData.id_cliente);
      
      const lists = JSON.parse(clienteData?.[0]?.listas_distribucion || "[]")
      const emailsCount = lists[0]?.correos?.length || 0;
      
      setCliente({
        nombre_cliente: clienteData?.[0]?.nombre_cliente,
        siglas: clienteData?.[0]?.siglas,
        email: clienteData?.[0]?.email,
        listas_distribucion: lists,
        emailsCount,
        newEmailsList: lists[0]?.correos || [],
        temas_subtemas: clienteData?.[0]?.temas_suscrit
      });
      setAlert({
        ...alertaData,
        destinatarios: alertaData?.destinatarios?.split(',') || []
      })
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
                <div className="text-gray-900 font-medium">{cliente.nombre_cliente}</div>
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
                  {`${analista?.nombre || 'N/A'} ${analista?.apellido || 'N/A'}`}
                </div>
                <div className="text-gray-900">{analista?.email || 'N/A'}</div>
              </div>
            </div>

            {/* Temas y Subtemas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Temas y Subtemas</label>
              <div className="flex flex-wrap gap-2">
                {(cliente?.temas_subtemas && cliente.temas_subtemas.length > 0) ? (
                  cliente.temas_subtemas.map((tema: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex px-3 py-1 text-sm bg-gray-100 text-stone-800 rounded-full"
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
            {alert.senado && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900 flex items-center">
                    📄 Documento de Fuente de Extracción
                  </h4>
                  <div className="flex items-center space-x-4">
                    <span className="bg-gray-100 text-gray-800 rounded-xl py-1 px-3 text-sm">
                      {alert.fuente}
                    </span>
                  </div>
                </div>

                {/* Tipo de proyecto - Solo mostrar si no es DOF */}
                {alert.senado.fuente !== sources[2] && (
                  <div className="space-y-2 mb-4">
                    <label className="form-label">Tipo de proyecto:</label>
                    <input
                      placeholder="Tipo de proyecto"
                      type="text"
                      value={alert.senado?.tipo || ''}
                      className="form-input bg-gray-100"
                      disabled={true}
                      readOnly
                    />
                  </div>
                )}
                
                {/* Document Editor - Read Only */}
                <div className="space-y-4">
                  <DocumentEditor
                    value={editorContent}
                    onChange={() => {}}
                    width="100%"
                    height="500px"
                    readOnly
                  />
                </div>

                {(alert?.senado?.fuente === sources[0] || alert?.senado?.fuente === sources[1]) && (
                  <div className="space-y-2 mt-4">
                    <label className="form-label">Estatus</label>
                    {(alert?.senado?.fuente === sources[0] || alert?.senado?.fuente === sources[1] || alert?.senado?.tipo === docTypes[0]) ? (
                      <Select2
                        value={alert?.estado_documento || ''}
                        onChange={() => {}}
                        options={ESTATUS_DOC_OPTIONS}
                        emptyOptionLabel="Sin estatus"
                        disabled={true}
                      />
                    ) : (
                      <input
                        type="text"
                        value={alert?.estado_documento || ''}
                        className="form-input"
                        placeholder="Estatus de la iniciativa o propuesta"
                      />
                    )}
                  </div>
                )}

                {/* Lista de destinatarios */}
                {alert.destinatarios && alert.destinatarios.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                    <h5 className="font-medium text-blue-900 mb-2">📬 Destinatarios ({alert.destinatarios.length})</h5>
                    <div className="text-sm text-blue-800 max-h-20 overflow-y-auto">
                      {alert.destinatarios.join(', ')}
                    </div>
                  </div>
                )}

                {/* Estado de análisis */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Estado de Análisis</label>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      alert.senado.analizado 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.senado.analizado ? 'Analizado' : 'Pendiente de análisis'}
                    </span>
                  </div>
                </div>

                {/* Enlaces adicionales si existen */}
                {alert.senado.link_iniciativa && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Enlace</label>
                    <div className="mt-1">
                      <a 
                        href={alert.senado.link_iniciativa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        Ver documento original
                      </a>
                    </div>
                  </div>
                )}
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
