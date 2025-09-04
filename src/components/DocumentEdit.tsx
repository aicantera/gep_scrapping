import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-toastify'
import { DocumentEditor } from './DocumentEditor'
import Select2 from './ui/select2'
import { ESTATUS_DOC_OPTIONS } from '@/utils/SelectOptions'

interface Document {
    id_senado_doc: number
    iniciativa_id: string
    created_at: string
    titulo: string
    tipo: string
    fuente: string
    dependencia: string
    temas: string
    subtema: string | null
    resumen: string
    sinopsis: string | null
    iniciativa_texto: string
    analisis: string
    leyes: string
    personas: string
    partidos: string
    Proponente: string
    objeto: string
    transitorios: string
    correspondiente: string
    analizado: boolean
    estado_editado_analista: string | null
    informacion_adicional: string | null
    ultimo_doc_expediente: string | null
    ver_expediente: string | null
    link_iniciativa: string
    link_documento: string
    imagen_link: string | null
    documento_html: string | null
    keywords: string
  }

const DocumentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [document, setDocument] = useState<Document | null>(null)
  const [editData, setEditData] = useState<Document | null>(null)
  const [editorContent, setEditorContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Source and document type constants
  const sources = ["Cámara de Diputados", "Cámara de Senadores", "Diario Oficial de la Federación"]
  const docTypes = ["INICIATIVA", "PUNTO DE ACUERDO"]

  useEffect(() => {
    fetchDocument()
  }, [id])

  useEffect(() => {
    if (document && editData && (editData.documento_html === '' || editData.documento_html === null)) {
      const htmlContent = generateDocumentHTML(editData)
      setEditorContent(htmlContent)
    } else if (document && editData && (document.documento_html !== null || document.documento_html !== '')) {
      setEditorContent(document.documento_html || '')
    }
  }, [document, editData])

  const fetchDocument = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('senado')
        .select('*')
        .eq('id_senado_doc', parseInt(id))
        .single()

      if (error) throw error
      
      setDocument(data)
      setEditData(data)
      console.log(data)
    } catch (error) {
      console.error('Error fetching document:', error)
      setError('Error al cargar el documento')
    } finally {
      setLoading(false)
    }
  }

  // Genera el HTML del documento si no existe
  const generateDocumentHTML = (doc: Document): string => {
    let html = ``
    console.log(doc)
    // 1. DOF
    if (doc.fuente === sources[2]) {
      // Título
      if (doc.titulo) {
        html += `<h3>Título</h3>`
        html += `<p>${doc.titulo}</p>`
      }

      // Fuente
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

  const handleChange = (field: keyof Document, value: string) => {
    if (!editData) return
    const updatedData = { ...editData, [field]: value }
    setEditData(updatedData)
  }

  const handleEditorChange = (html: string) => {
    setEditorContent(html)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editData) return

    try {
      setSaving(true)
      
      // Guardar contenido del editor en documento_html
      const updatedData = {
        ...editData,
        documento_html: editorContent
      }
      
      const { error } = await supabase
        .from('senado')
        .update({
            documento_html: updatedData.documento_html,
            resumen: updatedData.resumen
        })
        .eq('id_senado_doc', updatedData.id_senado_doc)

      if (error) throw error

      toast.success('Documento actualizado exitosamente')
      navigate('/gestion-documental', { 
        state: { successMessage: 'Documento actualizado exitosamente' }
      })
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error('Error al guardar el documento')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#D4133D]"></div>
          <p className="mt-4 text-gray-600">Cargando documento...</p>
        </div>
      </div>
    )
  }

  if (error || !document || !editData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Documento no encontrado'}</p>
          <button
            onClick={() => navigate('/gestion-documental')}
            className="px-4 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] transition-colors"
          >
            Volver a Gestión Documental
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
            <p className="text-sm text-gray-500">ID: {document.id_senado_doc}</p>
            <span className="bg-gray-100 rounded-xl py-1 px-3 text-sm text-gray-600">
              {document.fuente}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <form className="p-6 space-y-6">
            {/* Rich Text Editor */}
            {document.fuente !== sources[2] && (
              <div className="space-y-2">
                  <label className="form-label">Tipo de proyecto:</label>
                  <input
                      id="tipo"
                      name="tipo"
                      placeholder="Tipo de proyecto"
                      type="text"
                      value={document.tipo}
                      onChange={(e) => handleChange('tipo', e.target.value)}
                      className="form-input"
                      disabled={true}
                  />
              </div>
            )}
            <div className="space-y-2">
              <label className="form-label">Contenido del Documento:</label>
              <DocumentEditor
                value={editorContent}
                onChange={handleEditorChange}
                width="100%"
                height="500px"
                placeholder="Edita el contenido del documento aquí..."
              />
            </div>
            {(document.fuente !== sources[2] && (document.tipo === docTypes[0] || document.tipo === docTypes[1])) && (
              <div className="space-y-2">
                <label className="form-label">Estatus</label>
                {(editData.fuente === sources[0] || editData.fuente === sources[1] || editData.tipo === docTypes[0]) ? (
                  <Select2
                    value={editData.resumen}
                    onChange={(value: string) => handleChange('resumen', value)}
                    options={ESTATUS_DOC_OPTIONS}
                    emptyOptionLabel="Sin estatus"
                  />
                ) : (
                  <input
                    type="text"
                    value={editData.resumen}
                    onChange={(e) => handleChange('resumen', e.target.value)}
                    className="form-input"
                    placeholder="Estatus de la iniciativa o propuesta"
                  />
                )}
              </div>
            )}
            {/* Action buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/gestion-documental')}
                disabled={saving}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors border border-gray-300 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default DocumentEdit
