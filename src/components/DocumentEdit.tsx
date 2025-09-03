import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, ArrowLeft, X } from 'lucide-react'
import { ESTATUS_DOC_OPTIONS } from '../utils/SelectOptions'
import Select2 from './ui/select2'
import { supabase } from '../lib/supabase'
import { toast } from 'react-toastify'

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
    keywords: string
  }
  

const DocumentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Source and document type constants (matching DocumentManagement)
  const sources = ["Cámara de Diputados", "Cámara de Senadores", "Diario Oficial de la Federación"]
  const docTypes = ["Iniciativa", "Proposición"]

  useEffect(() => {
    fetchDocument()
  }, [id])

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
    } catch (error) {
      console.error('Error fetching document:', error)
      setError('Error al cargar el documento')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof Document, value: string) => {
    if (!document) return
    setDocument(prev => ({ ...prev!, [field]: value }))
  }

  const validateDocument = (doc: Document): boolean => {
    switch(doc.fuente){
      case sources[2]: // DOF
        if(!doc.iniciativa_texto || !doc.fuente || !doc.dependencia || !doc.temas || !doc.resumen || !doc.analisis) {
          toast.error('Todos los campos obligatorios deben estar completos para guardar los cambios.')
          return false
        }
        break
      default:
        if (!doc.iniciativa_texto || !doc.tipo || !doc.objeto) {
          toast.error('Todos los campos obligatorios deben estar completos para guardar los cambios.')
          return false
        }
        break
    }

    if(doc.tipo === docTypes[0] && (doc.fuente === sources[0] || doc.fuente === sources[1]) && (!doc.iniciativa_texto || !doc.tipo || !doc.Proponente || !doc.fuente || !doc.temas || !doc.objeto || !doc.analisis || !doc.resumen)) {
      toast.error('Todos los campos obligatorios deben estar completos para guardar los cambios.')
      return false
    }
    
    if(doc.tipo === docTypes[1] && (doc.fuente === sources[0] || doc.fuente === sources[1]) && (!doc.iniciativa_texto || !doc.tipo || !doc.Proponente || !doc.fuente || !doc.temas || !doc.objeto || !doc.analisis)) {
      toast.error('Todos los campos obligatorios deben estar completos para guardar los cambios.')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!document || !validateDocument(document)) return

    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('senado')
        .update({
            iniciativa_texto: document.iniciativa_texto,
            tipo: document.tipo,
            personas: document.personas,
            objeto: document.objeto,
            correspondiente: document.correspondiente,
            temas: document.temas,
            link_iniciativa: document.link_iniciativa,
            sinopsis: document.sinopsis,
            resumen: document.resumen,
            analisis: document.analisis,
            dependencia: document.dependencia,
            ver_expediente: document.ver_expediente,
            ultimo_doc_expediente: document.ultimo_doc_expediente,
            transitorios: document.transitorios,
            informacion_adicional: document.informacion_adicional,
            titulo: document.titulo
        })
        .eq('id_senado_doc', document.id_senado_doc)

      if (error) throw error

      // Navigate back to document management with success message
      navigate('/gestion-documental', { 
        state: { successMessage: 'Documento actualizado exitosamente' }
      })
    } catch (error) {
      console.error('Error saving document:', error)
      setError('Error al guardar el documento')
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

  if (error || !document) {
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
            <div className="flex items-center space-x-4">
              <span className="bg-gray-100 rounded-xl py-1 px-3 text-sm text-gray-600">
                {document.fuente}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="form-label">Título *</label>
                <input
                  id="titulo"
                  name="titulo"
                  placeholder="Título"
                  type="text"
                  value={document.titulo}
                  onChange={(e) => handleChange('titulo', e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              
              {document.fuente !== sources[2] && (
                <>
                  <div className="space-y-2">
                    <label className="form-label">Tipo de Proyecto</label>
                    <div className="form-input bg-gray-100 text-gray-600">
                      {document.tipo || 'No especificado'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="form-label">Proponente</label>
                    <input
                      id="Proponente"
                      name="Proponente"
                      placeholder="Proponente"
                      type="text"
                      value={document.Proponente}
                      onChange={(e) => handleChange('Proponente', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <label className="form-label">
                  {document.fuente === sources[2] ? "Órgano de difusión" : "Cámara de origen"}
                </label>
                <div className="form-input bg-gray-100 text-gray-600">
                  {document.fuente || 'No especificado'}
                </div>
              </div>
              
              {document.fuente === sources[2] && (
                <div className="space-y-2 md:col-span-2">
                  <label className="form-label">Dependencia</label>
                  <input
                    id="dependencia"
                    name="dependencia"
                    placeholder="Dependencia"
                    type="text"
                    value={document.dependencia}
                    onChange={(e) => handleChange('dependencia', e.target.value)}
                    className="form-input"
                  />
                </div>
              )}
              
              <div className="space-y-2 md:col-span-2">
                <label className="form-label">Temas/Subtemas</label>
                <input
                  id="temas"
                  name="temas"
                  placeholder="Temas/Subtemas"
                  type="text"
                  value={document.temas}
                  onChange={(e) => handleChange('temas', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              {document.fuente === sources[2] ? (
                <>
                  <label className="form-label">Resumen *</label>
                  <textarea
                    id="resumen"
                    name="resumen"
                    placeholder="Resumen"
                    value={document.resumen}
                    onChange={(e) => handleChange('resumen', e.target.value)}
                    className="form-input h-24 resize-none"
                    required
                  />
                </>
              ) : (
                <>
                  <label className="form-label">Objeto *</label>
                  <textarea
                    id="objeto"
                    name="objeto"
                    placeholder="Objeto"
                    value={document.objeto}
                    onChange={(e) => handleChange('objeto', e.target.value)}
                    className="form-input h-24 resize-none"
                    required
                  />
                </>
              )}
            </div>

            <div className="space-y-2">
              {document.fuente === sources[2] || ((document.fuente === sources[0] || document.fuente === sources[1]) && (document.tipo === docTypes[0] || document.tipo === docTypes[1])) ? (
                <>
                  <label className="form-label">Análisis</label>
                  <textarea
                    id="analisis"
                    name="analisis"
                    placeholder="Análisis"
                    value={document.analisis}
                    onChange={(e) => handleChange('analisis', e.target.value)}
                    className="form-input h-24 resize-none"
                  />
                </>
              ) : (
                <>
                  <label className="form-label">Correspondiente</label>
                  <textarea
                    id="correspondiente"
                    name="correspondiente"
                    placeholder="Correspondiente"
                    value={document.correspondiente}
                    onChange={(e) => handleChange('correspondiente', e.target.value)}
                    className="form-input h-24 resize-none"
                  />
                </>
              )}
            </div>

            {document.fuente !== sources[2] && (
              <>
                <div className="space-y-2">
                  {(document.tipo === docTypes[1] && (document.fuente === sources[0] || document.fuente === sources[1])) && (
                    <>
                      <label className="form-label">Transitorios</label>
                      <textarea
                        value={document.transitorios}
                        onChange={(e) => handleChange('transitorios', e.target.value)}
                        className="form-input h-24 resize-none"
                        placeholder="Transitorios de la iniciativa o propuesta"
                      />
                    </>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="form-label">Estatus</label>
                  {(document.fuente === sources[0] || document.fuente === sources[1] || document.tipo === docTypes[0]) ? (
                    <Select2
                      value={document.resumen}
                      onChange={(value: string) => handleChange('resumen', value)}
                      options={ESTATUS_DOC_OPTIONS}
                      emptyOptionLabel="Sin estatus"
                    />
                  ) : (
                    <input
                      type="text"
                      value={document.resumen}
                      onChange={(e) => handleChange('resumen', e.target.value)}
                      className="form-input"
                      placeholder="Estatus de la iniciativa o propuesta"
                    />
                  )}
                </div>
              </>
            )}

            {((document.tipo === docTypes[0] || document.tipo === docTypes[1]) && (document.fuente === sources[0] || document.fuente === sources[1])) && (
              <div className="space-y-2">
                <label className="form-label">Información adicional</label>
                <textarea
                  id="informacion_adicional"
                  name="informacion_adicional"
                  placeholder="Información adicional"
                  value={document.informacion_adicional || ''}
                  onChange={(e) => handleChange('informacion_adicional', e.target.value)}
                  className="form-input h-24 resize-none"
                />
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
                type="submit"
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
