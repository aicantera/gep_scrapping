import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X, Send, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-toastify'
import Select2 from './ui/select2'
import { ESTATUS_DOC_OPTIONS } from '@/utils/SelectOptions'
import { DocumentEditor } from './DocumentEditor'
import { useAuth } from '@/contexts/AuthContext'

const supabaseUrl = 'https://masterd.gepdigital.ai'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

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
  estado_documento?: string | null
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

const AlertEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [alert, setAlert] = useState<Alert | null>(null)
  const [editData, setEditData] = useState<Alert | null>(null)
  const [cliente, setCliente] = useState<any>(null)
  const [asuntoCorreo, setAsuntoCorreo] = useState<string>('')
  const [mensajeAdjunto, setMensajeAdjunto] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState<string>('')
  const [newEmail, setNewEmail] = useState<string>('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [localImages, setLocalImages] = useState<Map<string, File>>(new Map());


  // Source and document type constants
  const sources = ["Cámara de Diputados", "Cámara de Senadores", "Diario Oficial de la Federación", "CONAMER"]
  const docTypes = ["INICIATIVA", "PUNTO DE ACUERDO"]
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  useEffect(() => {
    fetchAlert()
  }, [id])

  useEffect(() => {
    if(alert && editData && editData.alerta_html && editData.alerta_html !== '') {
      setEditorContent(editData.alerta_html)
    } else if (alert && editData && (!editData.alerta_html || editData.alerta_html === '') && editData.senado && editData.senado.documento_html && editData.senado.documento_html !== '') { 
      setEditorContent(editData.senado.documento_html)
    } else if (alert && editData && (!editData.alerta_html || editData.alerta_html === '') && editData.senado && editData.senado.documento_html && editData.senado.documento_html === '') {
      const htmlContent = generateDocumentHTML(editData.senado)
      setEditorContent(htmlContent)
    }
  }, [alert])

  useEffect(() => {
    fetchAlert()
  }, [id])

  useEffect(() => {
    validateEmail()
  }, [newEmail])

  const validateEmail = () => {

    if(newEmail === '') {
      setEmailError(null)
      return
    }

    if (!isValidEmail(newEmail)) {
      setEmailError('Por favor ingresa un correo electrónico válido')
      return
    }
    
    if (editData?.destinatarios?.includes(newEmail)) {
      setEmailError('Este correo ya está agregado')
      return
    }
    setEmailError(null)
  };
  
  const addEmail = () => {
    if (!editData) return

    const trimmedEmail = newEmail.trim()
    if (!trimmedEmail) {
      setEmailError('Por favor ingresa un correo electrónico')
      return
    }

    setEditData({
      ...editData,
      destinatarios: [...(editData?.destinatarios || []), trimmedEmail]
    })
    setEmailError(null)
    setNewEmail('')
  };

  const removeEmail = (email: string) => {
    if (!editData) return
    setEditData({
      ...editData,
      destinatarios: editData.destinatarios?.filter((e: string) => e !== email)
    })
  };

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
      const { data: clienteData } = await supabase
        .from('clientes')
        .select("*")
        .eq('id_cliente', alertaData.id_cliente);
      
      const lists = typeof clienteData?.[0]?.listas_distribucion === 'string' ? JSON.parse(clienteData?.[0]?.listas_distribucion) : clienteData?.[0]?.listas_distribucion || [];
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
      setEditData({
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

  const handleImageAdded = (file: File, localUrl: string) => {
    setLocalImages(prevMap => new Map(prevMap).set(localUrl, file));
  };

  const aprobarAlerta = async () => {
    if (!alert || !asuntoCorreo.trim()) return

    const trimmedEmail = newEmail.trim()
    const hasValidEmailInInput = trimmedEmail && isValidEmail(trimmedEmail) && !editData?.destinatarios?.includes(trimmedEmail)

    if (!editData?.destinatarios?.length || editData?.destinatarios?.length === 0) {
      if(hasValidEmailInInput) {
        toast.error('Por favor agrega al menos un destinatario')
        return
      }

      if(trimmedEmail && !isValidEmail(trimmedEmail)) {
        setEmailError('Por favor ingresa un correo electrónico válido')
      } else {
        setEmailError('Por favor ingresa al menos un destinatario')
      }
      return
    }
    
    setSaving(true);
    try {
      let finalHtml = editorContent;

      // 1. Iterar sobre las imágenes locales guardadas en el estado
      for (const [localUrl, file] of localImages.entries()) {
        // Solo subir si la URL local todavía está en el contenido del editor
        if (finalHtml.includes(localUrl)) {
          const fileName = `doc_${id}_${Date.now()}.${file.name.split('.').pop()}`;

          // Subir la imagen a Supabase Storage usando fetch
          const formData = new FormData();
          formData.append('file', file);

          const resp = await fetch(supabaseUrl + '/storage/v1/object/documentos/' + fileName, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + supabaseServiceKey,
            },
            body: formData
          });

          if (!resp.ok) {
            throw new Error(`Error al subir la imagen: ${resp.statusText}`);
          }

          // Obtener la URL pública de la imagen subida
          const uploadData = await resp.json();
          const publicURLName = uploadData.Key.split('/').pop();

          const { data: publicUrlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(publicURLName);
          
          const publicURL = publicUrlData.publicUrl;

          // Reemplazar la URL del blob por la URL pública en el HTML
          finalHtml = finalHtml.replace(new RegExp(localUrl, 'g'), publicURL);
        }
      }
      
      // 2. Preparar los datos finales para guardar
      const dataToUpdate = {
        documento_html: finalHtml,
        estado: editData?.estado_documento || '',
      };

      // 3. Guardar los datos actualizados en la base de datos
      if (alert.senado) {
        const { error: docError } = await supabase
          .from('senado')
          .update(dataToUpdate)
          .eq('id_senado_doc', alert.senado.id_senado_doc)
        
        if (docError) throw docError;
      }

      // 4. Actualizar el estado de la alerta
      const { error: alertError } = await supabase
        .from('alertas_directorio')
        .update({
          estado: 'Enviado al Correo',
          enviado_correo: true,
          datetime_enviado_correo: new Date().toISOString(),
          asunto_email: asuntoCorreo,
          mensaje_email: mensajeAdjunto,
          id_analista: user?.id || null,
          destinatarios: editData?.destinatarios?.join(','),
          alerta_html: finalHtml,
          estado_documento: editData?.estado_documento || ''
        })
        .eq('id_alerta', alert.id_alerta)
      
      if (alertError) throw alertError
      
      toast.success('Alerta aprobada y enviada exitosamente')
      navigate('/gestion-alertas', { 
        state: { successMessage: 'Alerta aprobada y enviada exitosamente' }
      })
    } catch (error) {
      console.error('Error approving alert:', error)
      toast.error('Error al aprobar la alerta')
    } finally {
      setSaving(false)
    }
  }

  const handleChangeStatus = (value: string) => {
    if (!value) {
      setEditData(prev => prev ? { ...prev, estado_documento: '' } : null);
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(editorContent || '', 'text/html');
    const body = doc.body;
    const statusLabel = ESTATUS_DOC_OPTIONS.find(opt => opt.value === value)?.label || value;

    // Prefijo a buscar en texto (sin tags)
    const STATUS_PREFIX = 'Estatus';

    // Normaliza y comprueba si el elemento contiene el prefijo "Estatus:" al inicio
    const isStatusNode = (el: Element) => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      // Coincide "Estatus:" al inicio, case-insensitive
      return new RegExp(`^\\s*${STATUS_PREFIX}\\s*:`, 'i').test(text);
    };

    // Busca todos los <p> y toma el último que cumpla la condición (por si hay duplicados)
    const paragraphs = Array.from(body.querySelectorAll('p'));
    const statusParagraph = paragraphs.reverse().find(p => isStatusNode(p)) as HTMLParagraphElement | undefined;

    if (statusParagraph) {
      // Actualiza el contenido del párrafo encontrado
      statusParagraph.innerHTML = `<strong>Estatus:</strong> ${statusLabel}`;
    } else {
      // Crea uno nuevo al final
      const newStatusParagraph = doc.createElement('p');
      newStatusParagraph.className = 'document-status'; // opcional
      newStatusParagraph.innerHTML = `<strong>Estatus:</strong> ${statusLabel}`;
      body.appendChild(newStatusParagraph);
    }

    setEditorContent(body.innerHTML);
    setEditData(prev => prev ? { ...prev, estado_documento: value } : null);
  };

  const rechazarAlerta = async () => {
    if (!alert) return
    
    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('alertas_directorio')
        .update({
          estado: 'rechazadas',
          id_analista: user?.id || null
        })
        .eq('id_alerta', alert.id_alerta)
      
      if (error) throw error
      
      toast.success('Alerta rechazada exitosamente')
      navigate('/gestion-alertas', { 
        state: { successMessage: 'Alerta rechazada exitosamente' }
      })
    } catch (error) {
      console.error('Error rejecting alert:', error)
      toast.error('Error al rechazar la alerta')
    } finally {
      setSaving(false)
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
                Validar Alerta #{alert.id_alerta}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-yellow-100 text-yellow-800 rounded-xl py-1 px-3 text-sm">
                {alert.estado}
              </span>
              <span className="bg-gray-100 text-gray-800 rounded-xl py-1 px-3 text-sm">
                {alert.fuente}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 space-y-6">
            {/* Información de la alerta */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">📋 Información de la Alerta</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Cliente:</span>
                  <div className="text-gray-900">{cliente.nombre_cliente}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Fecha de Creación:</span>
                  <div className="text-gray-900">{new Date(alert.created_at).toLocaleDateString('es-MX')}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Temas y Subtemas:</span>
                  <div className="text-gray-900">{cliente.temas_subtemas?.map((tema: string) => {
                    const temaData = JSON.parse(tema);
                    return temaData.nombre_tema || temaData.subtema_text;
                  }).join(', ')}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Destinatarios:</span>
                  <div className="text-gray-900">{cliente.emailsCount} correos</div>
                </div>
              </div>
            </div>

            {editData?.senado && editData?.senado.fuente !== sources[2] && (
              <div className="space-y-2">
                  <label className="form-label">Tipo de proyecto:</label>
                  <input
                      id="tipo"
                      name="tipo"
                      placeholder="Tipo de proyecto"
                      type="text"
                      value={editData?.senado?.tipo || ''}
                      className="form-input"
                      disabled={true}
                  />
              </div>
            )}

            {/* Datos del Documento del Senado */}
            {editData?.senado && (
              <>
                <div className="space-y-4">
                  <DocumentEditor
                    value={editorContent}
                    onChange={(html) => setEditorContent(html)}
                    onImageAdded={handleImageAdded}
                    width="100%"
                    height="500px"
                    placeholder="Edita el contenido del documento aquí..."
                  />
                </div>
                {(editData?.senado?.fuente === sources[0] || editData?.senado?.fuente === sources[1]) && (
                  <div className="space-y-2">
                    <label className="form-label">Estatus</label>
                    {(editData?.senado?.fuente === sources[0] || editData?.senado?.fuente === sources[1] || editData?.senado?.tipo === docTypes[0]) ? (
                      <Select2
                        value={editData?.estado_documento || ''}
                        onChange={(value: string) => handleChangeStatus(value)}
                        options={ESTATUS_DOC_OPTIONS}
                        emptyOptionLabel="Sin estatus"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editData?.estado_documento || ''}
                        onChange={(e) => setEditData({ ...editData, estado_documento: e.target.value })}
                        className="form-input"
                        placeholder="Estatus de la iniciativa o propuesta"
                      />
                    )}
                  </div>
                )}
              </>
            )}
            {/* Lista de destinatarios */}
            <div className="space-y-4">
              <label className="form-label">Destinatarios</label>
              {editData?.destinatarios && editData.destinatarios.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Destinatarios agregados ({editData.destinatarios.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {editData.destinatarios.map((email, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm border border-blue-200"
                      >
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => removeEmail(email)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-1 transition-colors"
                          title="Eliminar destinatario"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !emailError && newEmail !== '') {
                      e.preventDefault()
                      addEmail()
                    }
                  }}
                  placeholder="Ingresa un correo electrónico"
                  className={`form-input flex-1 ${emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                />
                <button
                  type="button"
                  onClick={addEmail}
                  className="btn-primary px-4 py-2 whitespace-nowrap rounded-lg sm:max-w-[100px]"
                  disabled={emailError !== null || newEmail === ''}
                >
                  Agregar
                </button>
              </div>

              {emailError && (
                <p className="text-red-600 text-sm !mt-0">{emailError}</p>
              )}
            </div>

            {/* Configuración del envío */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">📧 Configuración del Envío</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asunto del Correo *
                </label>
                <input
                  type="text"
                  value={asuntoCorreo}
                  onChange={(e) => setAsuntoCorreo(e.target.value)}
                  className="form-input w-full"
                  placeholder="Ingresa el asunto del correo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje Adjunto
                </label>
                {/* <textarea
                  value={mensajeAdjunto}
                  onChange={(e) => setMensajeAdjunto(e.target.value)}
                  className="form-input w-full h-24 resize-none"
                  placeholder="Mensaje adicional para el correo (opcional)"
                /> */}
                <DocumentEditor
                  value={mensajeAdjunto}
                  onChange={(html) => setMensajeAdjunto(html)}
                  onImageAdded={handleImageAdded}
                  width="100%"
                  height="500px"
                  placeholder="Edita el contenido del mensaje adjunto aquí..."
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/gestion-alertas')}
                disabled={saving}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors border border-gray-300 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={rechazarAlerta}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <XCircle size={16} />
                {saving ? 'Rechazando...' : 'Rechazar'}
              </button>
              <button
                type="button"
                onClick={aprobarAlerta}
                disabled={saving || !asuntoCorreo.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
                {saving ? 'Enviando...' : 'Aprobar y Enviar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlertEdit
