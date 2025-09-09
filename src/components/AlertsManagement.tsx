import React, { useState, useEffect, useMemo } from 'react'
import { 
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle,
  Download,
  Eye,
  Trash2,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'

// Interfaces para tipado
interface Alerta {
  // Campos REALES de la tabla alertas_directorio
  id_alerta: number                    // bigint
  created_at: string                   // timestamp with time zone
  id_cliente: string                   // uuid
  status_alerta: boolean | null        // boolean nullable
  temas: string[] | null              // ARRAY nullable
  sub_tema: string[] | null           // ARRAY nullable
  fuente: string | null               // text nullable
  estado: string | null               // text nullable ('pendientes' | 'enviadas' | 'rechazadas')
  id_doc_senado: number | null        // bigint nullable
  id_analista: string | null          // text nullable
  enviado_correo: boolean | null      // boolean nullable
  datetime_enviado_correo: string | null // timestamp nullable
  link_pdf_enviado?: string | null    // url del pdf enviado
  tipo_alerta?: string | null         // text nullable
  
  // Campos calculados/derivados para la UI
  nombre_cliente?: string
  temas_subtemas?: string[]
  listas_distribucion?: {
    nombre: string;
    correo: string;
  }[]
  
  // Datos del documento del senado (si existe relación FK)
  documento_senado?: {
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
    [key: string]: any // Para campos adicionales
    titulo?: string
  } | null

  enviado_por?: any;
  emailsCount?: number;
  newEmailsList?: string[];
}

const AlertsManagement: React.FC = () => {
  const navigate = useNavigate();

  // Función para normalizar texto removiendo tildes
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  // Estados principales
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  // Estados de navegación
  const [activeTab, setActiveTab] = useState<'pendientes' | 'enviadas' | 'rechazadas'>('pendientes')
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFuente, setFilterFuente] = useState<string>('')
  const [filterFecha, setFilterFecha] = useState({ desde: '', hasta: '' })

  // Tipos de fuente disponibles
  type TipoFuente = 'Cámaras' | 'DOF' | 'CONAMER'

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const alertasPorPagina = 10

  // Estados de modales
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<Alerta | null>(null)

  // Función para calcular listas de distribución basadas en temas de alertas
  const calcularListasDistribucion = async (alertas: Alerta[]): Promise<Alerta[]> => {
    try {
      // Obtener todos los clientes únicos de las alertas
      const clientesIds = [...new Set(alertas.map(alerta => alerta.id_cliente).filter(Boolean))]
      
      if (clientesIds.length === 0) {
        return alertas
      }

      // Cargar datos de clientes con sus listas de distribución
      const { data: clientesData, error } = await supabase
        .from('clientes')
        .select('id_cliente, listas_distribucion')
        .in('id_cliente', clientesIds)

      if (error) {
        console.error('❌ Error cargando datos de clientes para listas:', error)
        return alertas
      }

      // Crear mapa de clientes para búsqueda rápida
      const clientesMap = new Map()
      if (clientesData) {
        clientesData.forEach(cliente => {
          let listasDistribucion = []
          
          // Parsear listas de distribución si es string
          if (cliente.listas_distribucion) {
            if (typeof cliente.listas_distribucion === 'string') {
              try {
                listasDistribucion = JSON.parse(cliente.listas_distribucion)
              } catch (e) {
                console.warn('Error parseando listas_distribucion para cliente:', cliente.id_cliente, e)
                listasDistribucion = []
              }
            } else if (Array.isArray(cliente.listas_distribucion)) {
              listasDistribucion = cliente.listas_distribucion
            }
          }
          
          clientesMap.set(cliente.id_cliente, listasDistribucion)
        })
      }

      // Procesar cada alerta para calcular sus listas de distribución
      const alertasConListas = alertas.map(alerta => {
        const listasCliente = clientesMap.get(alerta.id_cliente) || []
        const temasAlerta = alerta.temas_subtemas || []
        
        // Buscar listas que contengan los temas de la alerta
        const correosDestino: string[] = []
        
        listasCliente.forEach((lista: any) => {
          if (lista.temas_subtemas && Array.isArray(lista.temas_subtemas)) {
            // Verificar si algún tema de la alerta coincide con los temas de esta lista
            const hayCoincidencia = temasAlerta.some(temaAlerta => 
              lista.temas_subtemas.some((temaLista: string) => 
                temaLista.toLowerCase().trim() === temaAlerta.toLowerCase().trim()
              )
            )
            
            if (hayCoincidencia && lista.correos && Array.isArray(lista.correos)) {
              // lista.correos puede ser un array de strings o de objetos { correo, nombre }
              lista.correos.forEach((c: any) => {
                if (typeof c === 'string') {
                  correosDestino.push(c)
                } else if (c && typeof c.correo === 'string') {
                  correosDestino.push(c.correo)
                }
              })
            }
          }
        })

        // Eliminar duplicados de correos
        const correosUnicos = Array.from(new Set(correosDestino))

        // Convertir a la forma esperada por la interfaz: { nombre, correo }[]
        const listasDistribucion = correosUnicos.map(email => ({ nombre: '', correo: email }))
        
        return {
          ...alerta,
          listas_distribucion: listasDistribucion
        }
      })

      return alertasConListas

    } catch (error) {
      console.error('❌ Error calculando listas de distribución:', error)
      return alertas
    }
  }

  // Función para cargar alertas - VERSIÓN FINAL OPTIMIZADA
  const loadAlertas = async () => {
    setLoading(true)
    try {
      
      const { data: alertasData, error } = await supabase
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
          id_doc_senado,
          id_analista,
          enviado_correo,
          datetime_enviado_correo,
          link_pdf_enviado,
          tipo_alerta,
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
            link_documento
          )
        `)
        .order('id_alerta', { ascending: false })

      if (error) {
        console.error('❌ Error cargando alertas:', error)
        throw error
      }

      // Procesar alertas con máxima tolerancia
      const alertasProcesadas: Alerta[] = (alertasData || []).map((alerta: Record<string, any>) => {
        // Procesar temas (de la alerta)
        let temasAlerta: string[] = []
        if (alerta.temas) {
          if (Array.isArray(alerta.temas)) {
            temasAlerta = alerta.temas.filter(Boolean)
          } else if (typeof alerta.temas === 'string') {
            temasAlerta = [alerta.temas].filter(Boolean)
          }
        }

        // Procesar sub_tema (de la alerta)
        let subTemasAlerta: string[] = []
        if (alerta.sub_tema) {
          if (Array.isArray(alerta.sub_tema)) {
            subTemasAlerta = alerta.sub_tema.filter(Boolean)
          } else if (typeof alerta.sub_tema === 'string') {
            subTemasAlerta = [alerta.sub_tema].filter(Boolean)
          }
        }

        // Procesar temas del senado
        let temasSenado: string[] = []
        if (alerta.senado?.temas) {
          if (Array.isArray(alerta.senado.temas)) {
            temasSenado = alerta.senado.temas.filter(Boolean)
          } else if (typeof alerta.senado.temas === 'string') {
            temasSenado = [alerta.senado.temas].filter(Boolean)
          }
        }

        // Combinar todos los temas
        const todosTemas = [...temasAlerta, ...subTemasAlerta, ...temasSenado]
        const temasUnicos = todosTemas.length > 0 ? Array.from(new Set(todosTemas)) : ['Sin temas']

        // Nombre del cliente con fallbacks
        let nombreCliente = 'Cliente no encontrado'
        if (alerta.clientes?.nombre_cliente) {
          nombreCliente = alerta.clientes.nombre_cliente
        } else if (alerta.clientes?.siglas) {
          nombreCliente = alerta.clientes.siglas
        }

        // Normalizar estado - CLAVE PARA EL PROBLEMA
        let estadoNormalizado = 'pendientes'
        if (alerta.estado) {
          const estadoOriginal = String(alerta.estado).trim()
          const estado = estadoOriginal.toLowerCase()
          
          if (estado === 'pendiente' || estado === 'pendientes') {
            estadoNormalizado = 'pendientes'
          } else if (estado === 'enviada' || estado === 'enviadas' || estadoOriginal === 'Enviado al Correo') {
            estadoNormalizado = 'enviadas'
          } else if (estado === 'rechazada' || estado === 'rechazadas') {
            estadoNormalizado = 'rechazadas'
          } else {
            estadoNormalizado = 'pendientes' // Valor por defecto
          }
        }

        return {
          id_alerta: alerta.id_alerta,
          created_at: alerta.created_at,
          id_cliente: alerta.id_cliente || '',
          status_alerta: alerta.status_alerta,
          temas: temasAlerta.length > 0 ? temasAlerta : null,
          sub_tema: subTemasAlerta.length > 0 ? subTemasAlerta : null,
          fuente: alerta.fuente,
          estado: estadoNormalizado, // Usar estado normalizado
          id_doc_senado: alerta.id_doc_senado,
          id_analista: alerta.id_analista,
          enviado_correo: alerta.enviado_correo,
          datetime_enviado_correo: alerta.datetime_enviado_correo,
          link_pdf_enviado: alerta.link_pdf_enviado || null,
          tipo_alerta: alerta.tipo_alerta || null,
          
          // Campos derivados para UI (siempre arrays)
          nombre_cliente: nombreCliente,
          temas_subtemas: temasUnicos,
          listas_distribucion: [], // Se calculará después al cargar datos de cliente
          
          // Documento del senado completo
          documento_senado: alerta.senado ? {
            sinopsis: alerta.senado.sinopsis || null,
            Proponente: alerta.senado.Proponente || null,
            created_at: alerta.senado.created_at || null,
            link_iniciativa: alerta.senado.link_iniciativa || null,
            resumen: alerta.senado.resumen || null,
            tipo: alerta.senado.tipo || null,
            objeto: alerta.senado.objeto || null,
            gaceta: alerta.senado.gaceta || null,
            temas: alerta.senado.temas || null,
            personas: alerta.senado.personas || null,
            partidos: alerta.senado.partidos || null,
            iniciativa_texto: alerta.senado.iniciativa_texto || null,
            iniciativa_id: alerta.senado.iniciativa_id || null,
            imagen_link: alerta.senado.imagen_link || null,
            leyes: alerta.senado.leyes || null,
            analisis: alerta.senado.analisis || null,
            correspondiente: alerta.senado.correspondiente || null,
            analizado: alerta.senado.analizado || false,
            transitorios: alerta.senado.transitorios || null,
            fuente: alerta.senado.fuente || null,
            dependencia: alerta.senado.dependencia || null,
            ultimo_doc_expediente: alerta.senado.ultimo_doc_expediente || null,
            titulo: alerta.senado.titulo || null,
            ver_expediente: alerta.senado.ver_expediente || null,
            informacion_adicional: alerta.senado.informacion_adicional || null,
            link_documento: alerta.senado.link_documento || null
          } : null
        }
      })

      // Calcular listas de distribución para cada alerta
      const alertasConListasDistribucion = await calcularListasDistribucion(alertasProcesadas)
      setAlertas(alertasConListasDistribucion)

    } catch (error) {
      console.error('❌ Error completo cargando alertas:', error)
      setError('Error al cargar las alertas. Por favor, recarga la página.')
    } finally {
      setLoading(false)
    }
  }

  // Función para cargar clientes
  // const loadClientes = async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('clientes')
  //       .select('id_cliente, nombre_cliente, siglas, email')
  //       .eq('activo', true)
      
  //     if (error) throw error
  //     return data || [];
  //   } catch (error) {
  //     console.error('Error cargando clientes:', error)
  //   }
  // }

  // Función para filtrar alertas
  const alertasFiltradas = useMemo(() => {
    if (!alertas || alertas.length === 0) {
      return []
    }

    const filtradas = alertas.filter(alerta => {
      // Filtro por estado según la pestaña activa
      if (activeTab === 'pendientes' && alerta.estado !== 'pendientes') return false
      if (activeTab === 'enviadas' && alerta.estado !== 'enviadas') return false
      if (activeTab === 'rechazadas' && alerta.estado !== 'rechazadas') return false

      // Filtro por fuente
      if (filterFuente && alerta.fuente !== filterFuente) return false

      // Filtro por fechas (corregido)
      if (filterFecha.desde && filterFecha.hasta) {
        const fechaAlerta = new Date(alerta.created_at)
        const fechaDesde = new Date(filterFecha.desde + 'T00:00:00')
        const fechaHasta = new Date(filterFecha.hasta + 'T23:59:59.999')
        if (fechaAlerta < fechaDesde || fechaAlerta > fechaHasta) return false
      } else if (filterFecha.desde) {
        const fechaAlerta = new Date(alerta.created_at)
        const fechaDesde = new Date(filterFecha.desde + 'T00:00:00')
        if (fechaAlerta < fechaDesde) return false
      } else if (filterFecha.hasta) {
        const fechaAlerta = new Date(alerta.created_at)
        const fechaHasta = new Date(filterFecha.hasta + 'T23:59:59.999')
        if (fechaAlerta > fechaHasta) return false
      }

      // Filtro de búsqueda por texto
      if (searchTerm) {
        const searchNormalized = normalizeText(searchTerm)
        return (
          normalizeText(alerta.nombre_cliente || '').includes(searchNormalized) ||
          normalizeText(alerta.documento_senado?.sinopsis || '').includes(searchNormalized) ||
          (alerta.temas_subtemas || []).some(tema => normalizeText(tema).includes(searchNormalized))
        )
      }

      return true
    })

    setCurrentPage(1) // Reset página al filtrar

    return filtradas
  }, [alertas, activeTab, filterFuente, filterFecha, searchTerm])

  // Función para paginar alertas
  const alertasPaginadas = useMemo(() => {
    const inicio = (currentPage - 1) * alertasPorPagina
    const fin = inicio + alertasPorPagina
    return alertasFiltradas.slice(inicio, fin)
  }, [alertasFiltradas, currentPage, alertasPorPagina])

  const totalPaginas = Math.ceil(alertasFiltradas.length / alertasPorPagina)

  useEffect(() => {
    loadAlertas()
    // loadClientes()
  }, [])

  // Funciones simplificadas para trabajar con los campos reales
  const validarAlerta = async (alerta: Alerta) => {
    navigate(`/gestion-alertas/${alerta.id_alerta}/validar`);
  }

  const verAlerta = async (alerta: Alerta) => {
    navigate(`/gestion-alertas/${alerta.id_alerta}/ver`);
  }

  const eliminarAlerta = (alerta: Alerta) => {
    setAlertaSeleccionada(alerta)
    setShowDeleteModal(true)
  }

  const confirmarEliminar = async () => {
    if (!alertaSeleccionada) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('alertas_directorio')
        .delete()
        .eq('id_alerta', alertaSeleccionada.id_alerta)
      
      if (error) throw error
      
      setSuccessMessage('Alerta eliminada correctamente.')
      setShowDeleteModal(false)
      await loadAlertas()
      
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error) {
      console.error('Error eliminando alerta:', error)
      setError('No se pudo eliminar la alerta. Intenta nuevamente más tarde.')
    } finally {
      setLoading(false)
    }
  }

  // Función para descargar Excel con campos reales
  const descargarExcel = () => {
    const alertasParaExcel = alertasFiltradas.map(alerta => ({
      'ID': alerta.id_alerta,
      'Fecha de Creación': new Date(alerta.created_at).toLocaleDateString('es-MX'),
      'Cliente': alerta.nombre_cliente || 'N/A',
      'Fuente': alerta.fuente,
      'Documento': alerta.documento_senado?.sinopsis || alerta.documento_senado?.iniciativa_texto || 'Sin documento',
      'Temas': (alerta.temas || []).join(', '),
      'Subtemas': (alerta.sub_tema || []).join(', '),
      'Estado': alerta.estado,
      'Enviado por Correo': alerta.enviado_correo ? 'Sí' : 'No',
      'Fecha de Envío': alerta.datetime_enviado_correo ? new Date(alerta.datetime_enviado_correo).toLocaleDateString('es-MX') : 'N/A'
    }))
    
    const worksheet = XLSX.utils.json_to_sheet(alertasParaExcel)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alertas Enviadas')
    
    const fecha = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `alertas_enviadas_${fecha}.xlsx`)
  }

  // Cambiar de bandeja
  const cambiarBandeja = (nuevaBandeja: 'pendientes' | 'enviadas' | 'rechazadas') => {
    setActiveTab(nuevaBandeja)
    setCurrentPage(1)
  }

  // Limpiar filtros
  const limpiarFiltros = () => {
    setSearchTerm('')
    setFilterFuente('')
    setFilterFecha({ desde: '', hasta: '' })
    setCurrentPage(1)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Alertas y Monitoreo</h1>
          <p className="text-gray-600 mt-1">
            Gestiona las alertas de documentos por bandeja: Pendientes, Enviadas y Rechazadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              limpiarFiltros()
              setActiveTab('pendientes')
              loadAlertas()
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#999996] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-semibold text-center">
          {successMessage}
        </div>
      )}

      {/* Bandejas (Tabs) */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => cambiarBandeja('pendientes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pendientes'
                ? 'bg-[#fdbd3f] text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendientes ({alertas.filter(a => a.estado === 'pendientes').length})
          </button>
          <button
            onClick={() => cambiarBandeja('enviadas')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'enviadas'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Enviadas ({alertas.filter(a => a.estado === 'enviadas').length})
          </button>
          <button
            onClick={() => cambiarBandeja('rechazadas')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'rechazadas'
                ? 'bg-[#b30437] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rechazadas ({alertas.filter(a => a.estado === 'rechazadas').length})
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por documento, cliente, temas o correos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10 w-full"
              />
            </div>

            {/* Filtro por fuente */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={filterFuente}
                onChange={(e) => setFilterFuente(e.target.value as TipoFuente)}
                className="form-input pl-10 w-full"
              >
                <option value="">Todas las fuentes</option>
                <option value="Cámara de Diputados">Cámara de Diputados</option>
                <option value="Cámara de Senadores">Cámara de Senadores</option>
                <option value="Diario Oficial de la Federación">DOF</option>
                <option value="CONAMER">CONAMER</option>
              </select>
            </div>

            {/* Filtro fecha desde */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="date"
                value={filterFecha.desde}
                onChange={(e) => setFilterFecha({ ...filterFecha, desde: e.target.value })}
                className="form-input pl-10 w-full"
                placeholder="Fecha desde"
              />
            </div>

            {/* Filtro fecha hasta */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="date"
                min={filterFecha.desde}
                value={filterFecha.hasta}
                onChange={(e) => setFilterFecha({ ...filterFecha, hasta: e.target.value })}
                className="form-input pl-10 w-full"
                placeholder="Fecha hasta"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2">
              <button
                onClick={limpiarFiltros}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpiar
              </button>
              {activeTab === 'enviadas' && alertas.filter(a => a.estado === 'enviadas').length > 0 && (
                <button
                  onClick={descargarExcel}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download size={16} />
                  Excel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de alertas */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando alertas...</p>
          </div>
        ) : alertasPaginadas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">
              {searchTerm || filterFuente || filterFecha.desde || filterFecha.hasta
                ? 'No se encontraron alertas que coincidan con tu búsqueda.'
                : `No hay alertas ${activeTab === 'pendientes' ? 'pendientes' : activeTab === 'enviadas' ? 'enviadas' : 'rechazadas'}.`
              }
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fuente & Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alertasPaginadas.map((alerta) => (
                    <tr key={alerta.id_alerta} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          #{alerta.id_alerta}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(alerta.created_at).toLocaleDateString('es-MX')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {alerta.nombre_cliente}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {alerta?.tipo_alerta}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-sm">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {/* {alerta.fuente === 'Diario Oficial de la Federación' ? (
                            alerta.documento_senado?.titulo || 'Sin título'
                          ) : (
                            alerta.documento_senado?.sinopsis
                          )} */}
                          {alerta.documento_senado?.titulo || 'Sin título'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {alerta.documento_senado?.Proponente && (
                            <span>Por: {alerta.documento_senado.Proponente}</span>
                          )}

                        </div>
                        {alerta.documento_senado?.link_iniciativa && (
                          <div className="mt-1">
                            <a 
                              href={alerta.documento_senado.link_documento}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs underline"
                            >
                              Ver documento
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(alerta.temas_subtemas && alerta.temas_subtemas.length > 0) ? (
                            alerta.temas_subtemas.slice(0, 3).map((tema, index) => (
                              <span
                                key={index}
                                className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full"
                              >
                                {tema}
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              Sin temas
                            </span>
                          )}
                          {alerta.temas_subtemas && alerta.temas_subtemas.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{alerta.temas_subtemas.length - 3} más
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {alerta.fuente || 'Sin especificar'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {alerta.documento_senado?.created_at 
                            ? new Date(alerta.documento_senado.created_at).toLocaleDateString('es-MX')
                            : 'Fecha N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            alerta.estado === 'pendientes' ? 'bg-yellow-100 text-yellow-800' :
                            alerta.estado === 'enviadas' ? 'bg-green-100 text-green-800' :
                            alerta.estado === 'rechazadas' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {alerta.estado || 'Sin estado'}
                          </span>
                          {alerta.enviado_correo && (
                            <span className="text-xs text-green-600">
                              ✓ Correo enviado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {activeTab === 'pendientes' && (
                            <button
                              onClick={() => validarAlerta(alerta)}
                              className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                              title="Validar alerta"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          {alerta.estado === 'enviadas' && (
                            <>
                              <button
                                onClick={() => verAlerta(alerta)}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Ver detalles"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => eliminarAlerta(alerta)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Eliminar alerta"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                          {activeTab === 'rechazadas' && (
                            <button
                              onClick={() => eliminarAlerta(alerta)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Eliminar alerta"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando {((currentPage - 1) * alertasPorPagina) + 1} a {Math.min(currentPage * alertasPorPagina, alertas?.length)} de {alertas?.length} resultados
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
                      
                      if (totalPaginas <= maxVisiblePages) {
                        // Si hay pocas páginas, mostrar todas
                        for (let i = 1; i <= totalPaginas; i++) {
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
                        const end = Math.min(totalPaginas - 1, currentPage + 1)
                        
                        for (let i = start; i <= end; i++) {
                          if (i !== 1 && i !== totalPaginas) {
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
                        if (currentPage < totalPaginas - 3) {
                          pages.push(
                            <span key="ellipsis2" className="px-2 text-gray-500">...</span>
                          )
                        }
                        
                        // Siempre mostrar última página
                        if (totalPaginas > 1) {
                          pages.push(
                            <button
                              key={totalPaginas}
                              onClick={() => setCurrentPage(totalPaginas)}
                              className={`px-3 py-1 text-sm rounded ${
                                currentPage === totalPaginas
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {totalPaginas}
                            </button>
                          )
                        }
                      }
                      
                      return pages
                    })()}
                  </div>

                  {/* Botón Siguiente */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPaginas))}
                    disabled={currentPage === totalPaginas}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && alertaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Estás seguro?
              </h3>
              <p className="text-gray-600 mb-6">
                Esta acción eliminará permanentemente la alerta "{alertaSeleccionada.documento_senado?.sinopsis || ''}". Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminar}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Eliminando...' : 'Eliminar Alerta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

export default AlertsManagement