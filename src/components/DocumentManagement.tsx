import React, { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../lib/supabase'

// Importar configuración de Supabase
const supabaseUrl = 'https://masterd.gepdigital.ai'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'
import { 
  Search, 
  Download, 
  Edit, 
  Trash2, 
  ExternalLink,
  FileText,
  Calendar,
  Building,
  Users,
  Tag,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Save
} from 'lucide-react'
import { ESTATUS_DOC_OPTIONS } from '../utils/SelectOptions'
import Select2 from './ui/select2'

interface Document {
  id_senado_doc: number
  created_at: string
  sinopsis: string
  iniciativa_texto: string  // Corregido: era iniciativa_text
  iniciativa_id: string
  gaceta: string
  link_iniciativa: string
  link_documento?: string   // Campo para el enlace al documento PDF
  fuente: string
  imagen_link: string
  temas: string
  personas: string
  partidos: string
  leyes: string
  resumen: string
  analisis: string
  objeto: string
  correspondier: string
  tipo: string
  analizado?: string        // Nueva columna opcional
  Proponente?: string       // Nueva columna opcional
  dependencia?: string      // Nueva columna opcional
  ver_expediente?: string   // Nueva columna opcional
  ultimo_doc_expediente?: string // Nueva columna opcional
  transitorios?: string      // Nueva columna opcional
  informacion_adicional?: string // Nueva columna opcional
  titulo?: string // Nueva columna opcional
}

interface Filters {
  fuente: string
  fechaDesde: string
  fechaHasta: string
  busqueda: string
}

const DocumentManagement: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    fuente: '',
    fechaDesde: '',
    fechaHasta: '',
    busqueda: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalDocuments, setTotalDocuments] = useState(0)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const documentsPerPage = 10
  const sources = [
    'Cámara de Diputados',
    'Cámara de Senadores',
    'Diario Oficial de la Federación'
  ]
  
  const docTypes: string[] = [
    'PUNTO DE ACUERDO',
    'INICIATIVA',
  ];

  // Función para normalizar nombres de fuentes
  const normalizeSource = (source: string): string => {
    const sourceMap: { [key: string]: string } = {
      'cámara de senadores': 'Cámara de Senadores',
      'camara de senadores': 'Cámara de Senadores',
      'senadores': 'Cámara de Senadores',
      'cámara de diputados': 'Cámara de Diputados',
      'camara de diputados': 'Cámara de Diputados',
      'diputados': 'Cámara de Diputados',
      'diario oficial de la federación': 'Diario Oficial de la Federación',
      'diario oficial': 'Diario Oficial de la Federación',
      'dof': 'Diario Oficial de la Federación'
    }
    const normalized = sourceMap[source.toLowerCase()] || source
    console.log('🔧 Normalizando fuente:', source, '→', normalized)
    return normalized
  }

  // Patrones para filtrar fuente considerando sinónimos/variantes en BD
  const getFuentePatterns = (fuente: string): string[] => {
    const f = fuente.toLowerCase()
    if (!f) return []
    if (f.includes('diario') || f.includes('dof')) {
      // Coincidir tanto Federación como Nación y genérico "Diario Oficial"
      return ['diario oficial', 'federación', 'nación']
    }
    if (f.includes('senad')) {
      return ['senado', 'senadores', 'cámara de senadores']
    }
    if (f.includes('diput')) {
      return ['diputado', 'diputados', 'cámara de diputados']
    }

    return [fuente]
  }


  const fetchDocuments = async () => {
    setLoading(true)
    setError(null)

    console.log('📊 Iniciando fetchDocuments con filtros:', filters)

    try {
      // Estrategia: Usar una sola consulta con todos los filtros
      let query = supabase
        .from('senado')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      console.log('🔍 Query base creada, aplicando filtros...')

      // Aplicar filtros de fecha
      if (filters.fechaDesde) {
        console.log('📅 Aplicando filtro fecha desde:', filters.fechaDesde)
        // Inicio del día en ISO
        query = query.gte('created_at', `${filters.fechaDesde}T00:00:00`)
      }

      if (filters.fechaHasta) {
        console.log('📅 Aplicando filtro fecha hasta:', filters.fechaHasta)
        // Fin del día en ISO
        query = query.lte('created_at', `${filters.fechaHasta}T23:59:59`)
      }

      // Aplicar filtro de fuente
      if (filters.fuente) {
        const normalizedSource = normalizeSource(filters.fuente)
        console.log('🔧 Aplicando filtro de fuente:', filters.fuente, '→', normalizedSource)
        const patterns = getFuentePatterns(normalizedSource)
        if (patterns.length <= 1) {
          query = query.ilike('fuente', `%${patterns[0]}%`)
        } else {
          const orExpr = patterns.map(p => `fuente.ilike.%${p}%`).join(',')
          query = query.or(orExpr)
        }
        console.log('✅ Filtro de fuente aplicado')
      }

      // Aplicar búsqueda de texto
      if (filters.busqueda && filters.busqueda.trim()) {
        const searchTerm = filters.busqueda.trim()
        const sinAcentos = searchTerm.replace(/[áéíóúñü]/gi, c => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u','ñ':'n','ü':'u','Á':'a','É':'e','Í':'i','Ó':'o','Ú':'u','Ñ':'n','Ü':'u'}[c] || c))
        
        // Estrategia simple: buscar siempre ambas versiones (con y sin acentos)
        const terminos = new Set([
          searchTerm,           // término original
          sinAcentos           // versión sin acentos
        ])
        
        // Si el término no tiene acentos, generar versiones comunes con acentos
        if (searchTerm === sinAcentos) {
          const lower = searchTerm.toLowerCase()
          const upper = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase()
          
          // Agregar variaciones de capitalización
          terminos.add(lower)
          terminos.add(upper)
          
          // Generar versiones con acentos más comunes
          const conAcentosComunes = lower
            .replace(/cion/g, 'ción')
            .replace(/sion/g, 'sión')
            .replace(/acion/g, 'ación')
            .replace(/ia$/g, 'ía')
            .replace(/io$/g, 'ío')
            .replace(/^maria$/, 'maría')
            .replace(/^jose$/, 'josé')
            .replace(/^carlos$/, 'carlos')
            .replace(/^ana$/, 'ana')
          
          if (conAcentosComunes !== lower) {
            terminos.add(conAcentosComunes)
            terminos.add(conAcentosComunes.charAt(0).toUpperCase() + conAcentosComunes.slice(1))
          }
        }
        
        // Filtrar términos únicos y no vacíos
        const terminosFinales = Array.from(terminos).filter(t => t && t.trim())
        
        // Construir query con todos los términos
        const fields = ['iniciativa_texto', 'sinopsis', 'temas', 'personas', 'leyes']
        const conditions = terminosFinales.flatMap((term: string) => 
          fields.map(field => `${field}.ilike.%${term}%`)
        )
        
        query = query.or(conditions.join(','))
      }

      console.log('🔍 Query final construida, ejecutando...')

      // Aplicar paginación
      const from = (currentPage - 1) * documentsPerPage
      const to = from + documentsPerPage - 1

      const { data, error: fetchError, count } = await query
        .range(from, to)

      console.log('📊 Respuesta de Supabase:', {
        data: data?.length || 0,
        count: count || 0,
        error: fetchError ? fetchError.message : null
      })

      if (fetchError) {
        console.error('❌ Error en la consulta:', fetchError)
        throw fetchError
      }

      console.log('✅ Resultados de la consulta:', {
        documentosEncontrados: data?.length || 0,
        totalDocumentos: count || 0,
        paginaActual: currentPage,
        filtrosAplicados: filters
      })

      // Mostrar algunos ejemplos de documentos si hay datos
      if (data && data.length > 0) {
        console.log('📄 Ejemplos de documentos:', data.slice(0, 2).map(doc => ({
          id: doc.id_senado_doc,
          fuente: doc.fuente,
          titulo: doc.iniciativa_texto?.substring(0, 50) + '...',
          fecha: doc.created_at
        })))
      }

      setDocuments(data || [])
      setTotalDocuments(count || 0)
      setTotalPages(Math.ceil((count || 0) / documentsPerPage))

    } catch (err) {
      console.error('Error fetching documents:', err)
      setError('No se pudieron cargar los documentos. Intenta de nuevo más tarde.')
    } finally {
      setLoading(false)
    }
  }

  // Cargar documentos iniciales
  useEffect(() => {
    console.log('🚀 Componente montado, cargando documentos iniciales...')
    fetchDocuments()
  }, [])

  // Efecto para cambios en filtros y paginación
  useEffect(() => {
    console.log('🔄 Filtros o página cambiaron, recargando documentos...', { currentPage, filters })
    // Ejecutar fetchDocuments siempre que cambien estos valores
    fetchDocuments()
  }, [currentPage, filters.fuente, filters.fechaDesde, filters.fechaHasta])
  
  // Efecto separado para la búsqueda con debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
      setSearchTimeout(null)
    }
    
    if (filters.busqueda !== undefined) {
      console.log('🔍 Búsqueda cambió, aplicando debounce...', filters.busqueda)
      setIsSearching(true)
      
      const newTimeout = setTimeout(() => {
        console.log('🔍 Ejecutando búsqueda con debounce para:', filters.busqueda)
        fetchDocuments()
        setIsSearching(false)
      }, 500)
      
      setSearchTimeout(newTimeout)
    }
  }, [filters.busqueda])

  // Cleanup del timeout cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    console.log('🔄 Cambiando filtro:', key, '→', value)
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Siempre resetear a página 1 cuando cambien los filtros
  }

  const clearFilters = () => {
    console.log('🧹 Limpiando todos los filtros...')
    setFilters({
      fuente: '',
      fechaDesde: '',
      fechaHasta: '',
      busqueda: ''
    })
    setCurrentPage(1)
    
    // Limpiar timeout de búsqueda si existe
    if (searchTimeout) {
      clearTimeout(searchTimeout)
      setSearchTimeout(null)
    }
    
    // Recargar documentos sin filtros
    setTimeout(() => {
      fetchDocuments()
    }, 100)
  }











  const handleDownload = (document: Document) => {
    if (document.link_documento) {
      window.open(document.link_documento, '_blank')
    } else {
      alert('No hay enlace de descarga disponible para este documento.')
    }
  }

  const handleEdit = (document: Document) => {
    setSelectedDocument(document)
    setEditModalOpen(true)
  }

  const handleDeleteClick = (document: Document) => {
    console.log('🗑️ Intentando eliminar documento:', document.id_senado_doc, document.iniciativa_texto)
    setDocumentToDelete(document)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) {
      console.error('❌ No hay documento seleccionado para eliminar')
      return
    }

    console.log('🗑️ Confirmando eliminación del documento:', documentToDelete.id_senado_doc)
    setIsDeleting(true)

    try {
      // Verificar que el documento existe antes de eliminarlo
      const { data: existingDoc, error: checkError } = await supabase
        .from('senado')
        .select('id_senado_doc')
        .eq('id_senado_doc', documentToDelete.id_senado_doc)
        .single()

      if (checkError) {
        console.error('❌ Error al verificar documento:', checkError)
        alert('Error al verificar el documento. Intenta nuevamente.')
        return
      }

      if (!existingDoc) {
        console.error('❌ Documento no encontrado:', documentToDelete.id_senado_doc)
        alert('El documento no fue encontrado en la base de datos.')
        return
      }

      console.log('✅ Documento encontrado, procediendo a eliminar...')

      // Método 1: Intentar con cliente de administrador
      console.log('🔑 Método 1: Usando cliente de administrador...')
      let deleteError = null
      
      try {
        const { error } = await supabaseAdmin
          .from('senado')
          .delete()
          .eq('id_senado_doc', documentToDelete.id_senado_doc)
        
        deleteError = error
      } catch (adminErr) {
        console.error('❌ Error con cliente de administrador:', adminErr)
        deleteError = adminErr
      }

      // Método 2: Si falla el administrador, intentar con cliente normal
      if (deleteError) {
        console.log('🔄 Método 2: Intentando con cliente normal...')
        try {
          const { error } = await supabase
            .from('senado')
            .delete()
            .eq('id_senado_doc', documentToDelete.id_senado_doc)
          
          deleteError = error
        } catch (normalErr) {
          console.error('❌ Error con cliente normal:', normalErr)
          deleteError = normalErr
        }
      }

      // Método 3: Si ambos fallan, intentar con fetch directo
      if (deleteError) {
        console.log('🔄 Método 3: Intentando con fetch directo...')
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/senado?id_senado_doc=eq.${documentToDelete.id_senado_doc}`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            }
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            deleteError = new Error(`HTTP ${response.status}: ${errorText}`)
          } else {
            deleteError = null
          }
        } catch (fetchErr) {
          console.error('❌ Error con fetch directo:', fetchErr)
          deleteError = fetchErr
        }
      }

      if (deleteError) {
        console.error('❌ Todos los métodos de eliminación fallaron:', deleteError)
        throw deleteError
      }

      console.log('✅ Documento eliminado exitosamente')

      setDeleteModalOpen(false)
      setDocumentToDelete(null)
      alert('El documento ha sido eliminado correctamente.')
      
      // Recargar la lista de documentos
      await fetchDocuments()
      
    } catch (err) {
      console.error('❌ Error completo al eliminar documento:', err)
      
      // Mostrar mensaje de error más específico
      let errorMessage = 'Error al eliminar el documento. Intenta nuevamente.'
      
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = `Error: ${err.message}`
      }
      
      alert(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveEdit = async (editedDocument: Document) => {
    console.log('✏️ Intentando actualizar documento:', editedDocument.id_senado_doc)
    
    try {
      // Método 1: Intentar con cliente de administrador
      console.log('🔑 Método 1: Usando cliente de administrador para actualizar...')
      let updateError = null
      
      try {
        const { error } = await supabaseAdmin
          .from('senado')
          .update({
            iniciativa_texto: editedDocument.iniciativa_texto,
            tipo: editedDocument.tipo,
            personas: editedDocument.personas,
            objeto: editedDocument.objeto,
            correspondier: editedDocument.correspondier,
            temas: editedDocument.temas,
            gaceta: editedDocument.gaceta,
            link_iniciativa: editedDocument.link_iniciativa,
            sinopsis: editedDocument.sinopsis,
            resumen: editedDocument.resumen,
            analisis: editedDocument.analisis,
            dependencia: editedDocument.dependencia,
            ver_expediente: editedDocument.ver_expediente,
            ultimo_doc_expediente: editedDocument.ultimo_doc_expediente,
            transitorios: editedDocument.transitorios,
            informacion_adicional: editedDocument.informacion_adicional,
            titulo: editedDocument.titulo
          })
          .eq('id_senado_doc', editedDocument.id_senado_doc)
        
        updateError = error
      } catch (adminErr) {
        console.error('❌ Error con cliente de administrador:', adminErr)
        updateError = adminErr
      }

      // Método 2: Si falla el administrador, intentar con cliente normal
      if (updateError) {
        console.log('🔄 Método 2: Intentando con cliente normal...')
        try {
          const { error } = await supabase
            .from('senado')
            .update({
              iniciativa_texto: editedDocument.iniciativa_texto,
              tipo: editedDocument.tipo,
              personas: editedDocument.personas,
              objeto: editedDocument.objeto,
              correspondier: editedDocument.correspondier,
              temas: editedDocument.temas,
              gaceta: editedDocument.gaceta,
              link_iniciativa: editedDocument.link_iniciativa,
              sinopsis: editedDocument.sinopsis,
              resumen: editedDocument.resumen,
              analisis: editedDocument.analisis,
              dependencia: editedDocument.dependencia,
              ver_expediente: editedDocument.ver_expediente,
              ultimo_doc_expediente: editedDocument.ultimo_doc_expediente,
              transitorios: editedDocument.transitorios,
              informacion_adicional: editedDocument.informacion_adicional,
              titulo: editedDocument.titulo
            })
            .eq('id_senado_doc', editedDocument.id_senado_doc)
          
          updateError = error
        } catch (normalErr) {
          console.error('❌ Error con cliente normal:', normalErr)
          updateError = normalErr
        }
      }

      if (updateError) {
        console.error('❌ Todos los métodos de actualización fallaron:', updateError)
        throw updateError
      }

      console.log('✅ Documento actualizado exitosamente')

      setEditModalOpen(false)
      setSelectedDocument(null)
      alert('Documento actualizado correctamente.')
      fetchDocuments()
    } catch (err) {
      console.error('❌ Error completo al actualizar documento:', err)
      
      // Mostrar mensaje de error más específico
      let errorMessage = 'Error al actualizar el documento. Intenta nuevamente.'
      
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = `Error: ${err.message}`
      }
      
      alert(errorMessage)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const truncateText = (text: string, maxLength: number = 60) => {
    if (!text) return 'Sin información'
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  }

  const EditModal: React.FC = () => {
    const [editData, setEditData] = useState<Document>(selectedDocument!)

    const handleChange = (field: keyof Document, value: string) => {
      setEditData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      switch(editData.fuente){
        case sources[2]:
          if(!editData.iniciativa_texto || !editData.fuente || !editData.dependencia || !editData.temas || !editData.resumen || !editData.analisis || !editData.ultimo_doc_expediente || !editData.ver_expediente) {
            alert('Todos los campos obligatorios deben estar completos para guardar los cambios.')
            return
          }
          break
        case sources[3]:
          if(!editData.iniciativa_texto || !editData.fuente || !editData.dependencia || !editData.temas || !editData.resumen || !editData.analisis) {
            alert('Todos los campos obligatorios deben estar completos para guardar los cambios.')
            return
          }
          break
        default:
          if (!editData.iniciativa_texto || !editData.tipo || !editData.objeto) {
            alert('Todos los campos obligatorios deben estar completos para guardar los cambios.')
            return
          }
          break
        }

      if(editData.tipo === docTypes[0] && (editData.fuente === sources[0] || editData.fuente === sources[1]) && (!editData.iniciativa_texto || !editData.tipo || !editData.personas || !editData.fuente || !editData.temas || !editData.objeto || !editData.analisis || !editData.resumen)) {
        alert('Todos los campos obligatorios deben estar completos para guardar los cambios.')
        return;
      }
      if(editData.tipo === docTypes[1] && (editData.fuente === sources[0] || editData.fuente === sources[1]) && (!editData.iniciativa_texto || !editData.tipo || !editData.personas || !editData.fuente || !editData.temas || !editData.objeto || !editData.analisis)) {
        alert('Todos los campos obligatorios deben estar completos para guardar los cambios.')
        return;
      }

      handleSaveEdit(editData)
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Editar Documento</h3>
            <button
              onClick={() => setEditModalOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="form-label">Título *</label>
                  <input
                    type="text"
                    value={editData.titulo}
                    onChange={(e) => handleChange('titulo', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                { editData.fuente !== sources[3] && (
                  <>
                    <div className="space-y-2">
                      <label className="form-label">Tipo de Proyecto</label>
                      <div className="form-input bg-gray-100 text-gray-600">
                        {editData.tipo || 'No especificado'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="form-label">Proponente</label>
                      <input
                        type="text"
                        value={editData.personas}
                        onChange={(e) => handleChange('personas', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <label className="form-label">
                    {editData.fuente === sources[3] ? "Órgano de difusión" : "Cámara de origen"}
                  </label>
                  <div className="form-input bg-gray-100 text-gray-600">
                    {editData.fuente || 'No especificado'}
                  </div>
                </div>
                {/* Eliminados los campos de Gaceta y Enlace PDF */}
                {editData.fuente === sources[3] && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="form-label">Dependencia</label>
                    <input
                      type="text"
                      value={editData.dependencia}
                      onChange={(e) => handleChange('dependencia', e.target.value)}
                      className="form-input"
                    />
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <label className="form-label">Temas/Subtemas</label>
                  <input
                    type="text"
                    value={editData.temas}
                    onChange={(e) => handleChange('temas', e.target.value)}
                    className="form-input"
                  />
                </div>
                {/* Eliminados los campos de Gaceta y Enlace PDF */}
              </div>
              <div className="space-y-2">
              {editData.fuente === sources[3] ? (
                  <>
                    <label className="form-label">Resumen *</label>
                    <textarea
                      value={editData.resumen}
                      onChange={(e) => handleChange('resumen', e.target.value)}
                      className="form-input h-24 resize-none"
                      required
                    />
                  </>
                ) : (
                  <>
                    <label className="form-label">Objeto *</label>
                    <textarea
                      value={editData.objeto}
                      onChange={(e) => handleChange('objeto', e.target.value)}
                      className="form-input h-24 resize-none"
                      required
                    />
                  </>
                )}
              </div>
              <div className="space-y-2">
                {editData.fuente === sources[3] || ((editData.fuente === sources[0] || editData.fuente === sources[1]) && (editData.tipo === docTypes[0] || editData.tipo === docTypes[1])) ? (
                  <>
                    <label className="form-label">Análisis</label>
                    <textarea
                      value={editData.analisis}
                      onChange={(e) => handleChange('analisis', e.target.value)}
                      className="form-input h-24 resize-none"
                    />
                  </>
                ) : ( 
                  <>
                    <label className="form-label">Correspondiente</label>
                    <textarea
                      value={editData.sinopsis}
                      onChange={(e) => handleChange('sinopsis', e.target.value)}
                      className="form-input h-24 resize-none"
                    />
                  </>
                )}
              </div>
              { editData.fuente === sources[2] ? (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <label className="form-label">Último Documento del Expediente</label>
                    <textarea
                      value={editData.ultimo_doc_expediente}
                      onChange={(e) => handleChange('ultimo_doc_expediente', e.target.value)}
                      className="form-input resize-none"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="form-label">Link al enlace del expediente</label>
                    <input
                      type="text"
                      value={editData.ver_expediente}
                      onChange={(e) => handleChange('ver_expediente', e.target.value)}
                      className="form-input resize-none"
                    />
                  </div>
                </>
              ) : editData.fuente !== sources[3] && (
                <>
                  <div className="space-y-2">
                    {editData.tipo !== docTypes[0] && (
                      <>
                        <label className="form-label">Transitorios</label>
                        <textarea
                          value={editData.transitorios}
                          onChange={(e) => handleChange('transitorios', e.target.value)}
                          className="form-input h-24 resize-none"
                          placeholder="Transitorios de la iniciativa o propuesta"
                        />
                      </>
                    )}
                  </div>
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
                </>
              )}
              {((editData.tipo === docTypes[0] || editData.tipo === docTypes[1]) && (editData.fuente === sources[0] || editData.fuente === sources[1])) && (
                <div className="space-y-2">
                  <label className="form-label">Información adicional</label>
                  <textarea
                    value={editData.informacion_adicional}
                    onChange={(e) => handleChange('informacion_adicional', e.target.value)}
                    className="form-input h-24 resize-none"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 mt-6 rounded-xl bg-white p-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors border border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos Capturados</h1>
          <p className="text-gray-600">Gestión y análisis de documentos oficiales</p>
        </div>
                  <div className="flex gap-2">
            <button
              onClick={fetchDocuments}
              className="flex items-center gap-2 px-4 py-2 bg-[#999996] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
              <span className="sm:hidden">↻</span>
            </button>
            

          </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <label className="form-label">Fuente</label>
            <select
              value={filters.fuente}
              onChange={(e) => handleFilterChange('fuente', e.target.value)}
              className="form-input"
            >
              <option value="">Todas las fuentes</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="form-label">Fecha desde</label>
            <input
              type="date"
              value={filters.fechaDesde}
              onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
              className="form-input"
            />
          </div>

          <div className="space-y-2">
            <label className="form-label">Fecha hasta</label>
            <input
              type="date"
              value={filters.fechaHasta}
              onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
              className="form-input"
            />
          </div>

          <div className="space-y-2">
            <label className="form-label">Buscar</label>
            <div className="relative">
              {isSearching ? (
                <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              )}
              <input
                type="text"
                placeholder="Buscar en cualquier campo del documento..."
                value={filters.busqueda}
                onChange={(e) => handleFilterChange('busqueda', e.target.value)}
                className="form-input pl-10"
              />
              {filters.busqueda && (
                <button
                  onClick={() => handleFilterChange('busqueda', filters.busqueda)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                >
                  Buscar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Total: {totalDocuments} documentos</span>
            {(filters.fuente || filters.fechaDesde || filters.fechaHasta || filters.busqueda) && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                Filtros activos
              </span>
            )}
          </div>
          
          {(filters.fuente || filters.fechaDesde || filters.fechaHasta || filters.busqueda) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 text-sm flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2 text-gray-600">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Cargando documentos, por favor espera...</span>
          </div>
        </div>
      )}

      {/* Documents Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {documents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">No se encontraron documentos</p>
              <p className="text-sm">No se encontraron documentos que coincidan con los criterios seleccionados.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Título
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Proponente
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fuente
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Temas
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clientes
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documents.map((document) => (
                      <tr key={document.id_senado_doc} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {document.id_senado_doc}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 max-w-xs">
                            {truncateText(document.iniciativa_texto?.toUpperCase() || 'SIN TÍTULO', 80)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {document.tipo || 'Sin tipo'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs">
                            {truncateText(document.correspondier || 'Sin proponente', 40)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <Building className="w-3 h-3 mr-1" />
                            {document.fuente === 'senado' ? 'Cámara de Senadores' : document.fuente}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-500 mt-1">
                            { document.tipo ? 
                                document.fuente === sources[2] ?  
                                  'Proyecto'
                                : document.tipo 
                                : 'Sin tipo'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDate(document.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs">
                            {truncateText(document.objeto || document.sinopsis || 'Sin descripción')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-900">
                            <Tag className="w-4 h-4 mr-2 text-gray-400" />
                            {truncateText(document.temas || 'Sin temas', 40)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <Users className="w-3 h-3 mr-1" />
                            Sin clientes asociados
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {document.link_documento && (
                              <button
                                onClick={() => handleDownload(document)}
                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Descargar PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(document)}
                              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                              title="Editar documento"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(document)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Eliminar documento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {document.link_documento && (
                              <button
                                onClick={() => window.open(document.link_documento, '_blank')}
                                className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                                title="Ver enlace externo"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {((currentPage - 1) * documentsPerPage) + 1} a {Math.min(currentPage * documentsPerPage, totalDocuments)} de {totalDocuments} documentos
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Botón Anterior */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {/* Lógica de paginación inteligente */}
                      {(() => {
                        const pages = []
                        const maxVisiblePages = 7
                        
                        if (totalPages <= maxVisiblePages) {
                          // Si hay pocas páginas, mostrar todas
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                className={`px-3 py-1 text-sm rounded ${
                                  currentPage === i
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {i}
                              </button>
                            )
                          }
                        } else {
                          // Lógica para muchas páginas
                          // Siempre mostrar página 1
                          pages.push(
                            <button
                              key={1}
                              onClick={() => setCurrentPage(1)}
                              className={`px-3 py-1 text-sm rounded ${
                                currentPage === 1
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              1
                            </button>
                          )
                          
                          // Puntos suspensivos si hay gap
                          if (currentPage > 4) {
                            pages.push(
                              <span key="ellipsis1" className="px-2 text-gray-500">...</span>
                            )
                          }
                          
                          // Páginas alrededor de la actual
                          const start = Math.max(2, currentPage - 1)
                          const end = Math.min(totalPages - 1, currentPage + 1)
                          
                          for (let i = start; i <= end; i++) {
                            if (i !== 1 && i !== totalPages) {
                              pages.push(
                                <button
                                  key={i}
                                  onClick={() => setCurrentPage(i)}
                                  className={`px-3 py-1 text-sm rounded ${
                                    currentPage === i
                                      ? 'bg-blue-600 text-white'
                                      : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  {i}
                                </button>
                              )
                            }
                          }
                          
                          // Puntos suspensivos si hay gap
                          if (currentPage < totalPages - 3) {
                            pages.push(
                              <span key="ellipsis2" className="px-2 text-gray-500">...</span>
                            )
                          }
                          
                          // Siempre mostrar última página
                          if (totalPages > 1) {
                            pages.push(
                              <button
                                key={totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                                className={`px-3 py-1 text-sm rounded ${
                                  currentPage === totalPages
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {totalPages}
                              </button>
                            )
                          }
                        }
                        
                        return pages
                      })()}
                    </div>

                    {/* Botón Siguiente */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedDocument && <EditModal />}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && documentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirmar eliminación</h3>
                <p className="text-gray-600">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-700 mb-2">
                <strong>Documento a eliminar:</strong>
              </p>
              <p className="text-gray-700 mb-2">
                <strong>ID:</strong> {documentToDelete.id_senado_doc}
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Título:</strong> {truncateText(documentToDelete.iniciativa_texto, 80)}
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Fuente:</strong> {documentToDelete.fuente || 'Sin fuente'}
              </p>
              <p className="text-gray-700">
                <strong>Fecha:</strong> {formatDate(documentToDelete.created_at)}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-yellow-800 text-sm">
                ⚠️ <strong>Advertencia:</strong> Esta acción eliminará permanentemente el documento de la base de datos.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false)
                  setDocumentToDelete(null)
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 transition-colors font-medium disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar documento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentManagement
