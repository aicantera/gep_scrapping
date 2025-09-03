import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

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
  Tag,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const documentsPerPage = 10
  const sources = [
    'Cámara de Diputados',
    'Cámara de Senadores',
    'Diario Oficial de la Federación'
  ]

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage)
    }
  }, [location.state])

  async function fetchDocuments() {
    setLoading(true)
    setError(null)

    try {
      const andFilters: string[] = []

      // Fuente
      if (filters.fuente) {
        andFilters.push(`fuente.ilike.%${filters.fuente}%`)
      }

      // Fechas
      if (filters.fechaDesde) {
        andFilters.push(`created_at.gte.${filters.fechaDesde}T00:00:00`)
      }
      if (filters.fechaHasta) {
        andFilters.push(`created_at.lte.${filters.fechaHasta}T23:59:59`)
      }

      // Búsqueda en varios campos con variantes
      let orSearch = ''
      if (filters.busqueda && filters.busqueda.trim()) {
        const searchTerm = filters.busqueda.trim()
        // Quitar acentos
        const sinAcentos = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        // Variantes de capitalización
        const variantes = new Set([searchTerm, sinAcentos, searchTerm.toLowerCase(), searchTerm.toUpperCase()])
        const fields = [
          'iniciativa_texto',
          'sinopsis',
          'temas',
          'personas',
          'leyes',
          'objeto',
          'resumen',
          'Proponente'
        ]
        // Genera todas las combinaciones campo/variante
        const conditions = Array.from(variantes).flatMap(term =>
          fields.map(f => `${f}.ilike.%${term}%`)
        )
        orSearch = `or(${conditions.join(',')})`
      }

      // Construir el filtro AND
      let andQuery = andFilters.join(',')
      if (andQuery && orSearch) {
        andQuery = `and=(${andQuery},${orSearch})`
      } else if (andQuery) {
        andQuery = `and=(${andQuery})`
      } else if (orSearch) {
        andQuery = orSearch
      }

      // Paginación
      const from = (currentPage - 1) * documentsPerPage
      // const to = from + documentsPerPage - 1

      // URL final
      let url = `${supabaseUrl}/rest/v1/senado?select=*&order=created_at.desc`
      if (andQuery) url += `&${andQuery}`
      url += `&limit=${documentsPerPage}&offset=${from}`

      // Para contar total de documentos (sin paginación)
      let countUrl = `${supabaseUrl}/rest/v1/senado?select=id_senado_doc`
      if (andQuery) countUrl += `&${andQuery}`

      // Fetch documentos paginados
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error(`Error: ${response.status}`)

      const data = await response.json()

      // Fetch total count
      const countResponse = await fetch(countUrl, {
        method: 'GET',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Range-Unit': 'items',
          'Range': '0-0',
          'Prefer': 'count=exact'
        }
      })
      let total = 0
      if (countResponse.ok) {
        const contentRange = countResponse.headers.get('content-range')
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)$/)
          if (match) total = parseInt(match[1], 10)
        }
      }

      setDocuments(data || [])
      setTotalDocuments(total)
      setTotalPages(Math.ceil(total / documentsPerPage))

    } catch (error) {
      console.log("🚀 ~ fetchDocuments ~ error:", error)
      setError('No se pudieron cargar los documentos. Intenta de nuevo más tarde.')
    } finally {
      setLoading(false)
    }
  }

  // Cargar documentos iniciales
  useEffect(() => {
    fetchDocuments()
  }, [])

  // Efecto para cambios en filtros y paginación
  useEffect(() => {
    // Ejecutar fetchDocuments siempre que cambien estos valores
    fetchDocuments()
  }, [currentPage, filters.fuente, filters.fechaDesde, filters.fechaHasta])
  
  // Efecto separado para la búsqueda con debounce
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      fetchDocuments()
    }, 500)
    
    return () => clearTimeout(searchTimeout)
  }, [filters.busqueda])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Siempre resetear a página 1 cuando cambien los filtros
  }

  const clearFilters = () => {
    setFilters({
      fuente: '',
      fechaDesde: '',
      fechaHasta: '',
      busqueda: ''
    })
    setCurrentPage(1)
    
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
    navigate(`/gestion-documental/${document.id_senado_doc}/editar`)
  }

  const handleDeleteClick = (document: Document) => {
    navigate(`/gestion-documental/${document.id_senado_doc}/eliminar`)
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

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

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

      {/* Solo mensajes de éxito en la ventana principal */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-semibold text-center">
          {successMessage}
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <label className="form-label">Fuente</label>
            <select
              title='Fuente'
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
              title='Fecha desde'
              type="date"
              value={filters.fechaDesde}
              onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
              className="form-input"
            />
          </div>

          <div className="space-y-2">
            <label className="form-label">Fecha hasta</label>
            <input
              title='Fecha hasta'
              type="date"
              value={filters.fechaHasta}
              onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
              className="form-input"
            />
          </div>

          <div className="space-y-2">
            <label className="form-label">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                            {truncateText(document.Proponente || 'Sin proponente', 40)}
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
                    Mostrando {((currentPage - 1) * documentsPerPage) + 1} a {Math.min(currentPage * documentsPerPage, totalDocuments)} de {totalDocuments} resultados
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Botón Anterior */}
                    <button
                      title='Anterior'
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
                      title='Siguiente'
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

    </div>
  )
}

export default DocumentManagement
