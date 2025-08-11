import React, { useState, useEffect, useMemo } from 'react'
import { 
  AlertTriangle,
  X,
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
  Send,
  XCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

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
  
  // Campos calculados/derivados para la UI
  nombre_cliente?: string
  temas_subtemas?: string[]
  listas_distribucion?: string[]
  
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
    [key: string]: any // Para campos adicionales
  } | null
}



const AlertsManagement: React.FC = () => {
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
  const [showValidarModal, setShowValidarModal] = useState(false)
  const [showVerModal, setShowVerModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<Alerta | null>(null)

  // Estados del formulario de validación
  const [asuntoCorreo, setAsuntoCorreo] = useState('')
  const [mensajeAdjunto, setMensajeAdjunto] = useState('')

  // Estados para datos estructurados editables
  // eslint-disable-next-line @typescript-eslint/no-explicit-any


  // Estados para edición de documento del senado
  const [documentoEditable, setDocumentoEditable] = useState({
    sinopsis: '',
    Proponente: '',
    iniciativa_texto: '',
    iniciativa_id: '',
    gaceta: '',
    link_iniciativa: '',
    imagen_link: '',
    temas: '',
    personas: '',
    partidos: '',
    leyes: '',
    resumen: '',
    analisis: '',
    objeto: '',
    correspondiente: '',
    tipo: '',
    analizado: false
  })

  // Estados para clientes (usados en validación) - ELIMINANDO VARIABLES NO USADAS

  // Función para calcular listas de distribución basadas en temas de alertas
  const calcularListasDistribucion = async (alertas: Alerta[]): Promise<Alerta[]> => {
    try {
      // Obtener todos los clientes únicos de las alertas
      const clientesIds = [...new Set(alertas.map(alerta => alerta.id_cliente).filter(Boolean))]
      
      if (clientesIds.length === 0) {
        console.log('⚠️ No hay clientes para procesar listas de distribución')
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
              correosDestino.push(...lista.correos)
            }
          }
        })

        // Eliminar duplicados de correos
        const correosUnicos = [...new Set(correosDestino)]
        
        return {
          ...alerta,
          listas_distribucion: correosUnicos
        }
      })

      console.log('✅ Listas de distribución calculadas exitosamente')
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
      console.log('🔍 Cargando alertas con relaciones FK...')
      
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
          clientes (
            nombre_cliente,
            siglas,
            email
          ),
          senado (
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
            correspondiente,
            analizado
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error cargando alertas:', error)
        throw error
      }

      console.log('🔍 Alertas encontradas:', alertasData?.length || 0)
      
      if (alertasData && alertasData.length > 0) {
        console.log('🔍 Ejemplo de alerta con estado:', {
          id: alertasData[0].id_alerta,
          estado: alertasData[0].estado,
          tipoEstado: typeof alertasData[0].estado,
          estadoLength: alertasData[0].estado?.length
        })
        
        // Log de todos los estados únicos encontrados
        const estadosUnicos = [...new Set(alertasData.map(a => a.estado))]
        console.log('🔍 Estados únicos encontrados:', estadosUnicos)
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
          const estado = String(alerta.estado).toLowerCase().trim()
          if (estado === 'pendiente' || estado === 'pendientes') {
            estadoNormalizado = 'pendientes'
          } else if (estado === 'enviada' || estado === 'enviadas') {
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
            analizado: alerta.senado.analizado || false
          } : null
        }
      })

      // Calcular listas de distribución para cada alerta
      const alertasConListasDistribucion = await calcularListasDistribucion(alertasProcesadas)
      setAlertas(alertasConListasDistribucion)
      
      // Log por estado DESPUÉS de normalización
      const estadoCounts = alertasConListasDistribucion.reduce((acc: Record<string, number>, alerta: Alerta) => {
        const estado = alerta.estado || 'pendientes'
        acc[estado] = (acc[estado] || 0) + 1
        return acc
      }, {})
      console.log('📈 Por estado (DESPUÉS de normalización):', estadoCounts)

    } catch (error) {
      console.error('❌ Error completo cargando alertas:', error)
      setError('Error al cargar las alertas. Por favor, recarga la página.')
    } finally {
      setLoading(false)
    }
  }

  // Función para cargar clientes
  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id_cliente, nombre_cliente, siglas, email')
        .eq('activo', true)

      if (error) throw error

      const clientesProcessed = (data || []).map(cliente => ({
        id_cliente: cliente.id_cliente,
        nombre_cliente: cliente.nombre_cliente || '',
        siglas: cliente.siglas || '',
        email: cliente.email || '',
        listas_distribucion: [] // Simplificado por ahora
      }))

      // No necesitamos setClientes ya que no lo usamos
      console.log('🔍 Clientes cargados:', clientesProcessed.length)
    } catch (error) {
      console.error('Error cargando clientes:', error)
    }
  }

  // Función para filtrar alertas
  const alertasFiltradas = useMemo(() => {
    if (!alertas || alertas.length === 0) {
      console.log('🔍 No hay alertas para filtrar')
      return []
    }

    console.log('🔍 Filtrando alertas:', {
      totalAlertas: alertas.length,
      activeTab,
      estados: alertas.map(a => a.estado)
    })

    const filtradas = alertas.filter(alerta => {
      // Filtro por estado según la pestaña activa
      if (activeTab === 'pendientes' && alerta.estado !== 'pendientes') return false
      if (activeTab === 'enviadas' && alerta.estado !== 'enviadas') return false
      if (activeTab === 'rechazadas' && alerta.estado !== 'rechazadas') return false

      // Filtro por fuente
      if (filterFuente && alerta.fuente !== filterFuente) return false
      
      // Filtro por fechas
      if (filterFecha.desde && new Date(alerta.created_at) < new Date(filterFecha.desde)) return false
      if (filterFecha.hasta && new Date(alerta.created_at) > new Date(filterFecha.hasta)) return false
      
      // Filtro de búsqueda por texto
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          (alerta.nombre_cliente || '').toLowerCase().includes(searchLower) ||
          (alerta.documento_senado?.sinopsis || '').toLowerCase().includes(searchLower) ||
          (alerta.temas_subtemas || []).some(tema => tema.toLowerCase().includes(searchLower))
        )
      }
      
      return true
    })

    console.log('🔍 Resultado del filtrado:', {
      alertasFiltradas: filtradas.length,
      activeTab,
      estadosEncontrados: filtradas.map(a => a.estado)
    })

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
    console.log('🚀 Iniciando carga de datos...')
    loadAlertas()
    loadClientes()
  }, [])

  // Debug para ver el estado de las alertas
  useEffect(() => {
    console.log('📊 Estado actual de alertas:', {
      total: alertas.length,
      filtradas: alertasFiltradas.length,
      activeTab,
      porEstado: {
        pendientes: alertas.filter(a => a.estado === 'pendientes').length,
        enviadas: alertas.filter(a => a.estado === 'enviadas').length,
        rechazadas: alertas.filter(a => a.estado === 'rechazadas').length
      }
    })
  }, [alertas, alertasFiltradas, activeTab])

  // Funciones simplificadas para trabajar con los campos reales
  const validarAlerta = (alerta: Alerta) => {
    setAlertaSeleccionada(alerta)
    
    // Inicializar datos del documento del senado para edición
    if (alerta.documento_senado) {
      setDocumentoEditable({
        sinopsis: alerta.documento_senado.sinopsis || '',
        Proponente: alerta.documento_senado.Proponente || '',
        iniciativa_texto: alerta.documento_senado.iniciativa_texto || '',
        iniciativa_id: alerta.documento_senado.iniciativa_id || '',
        gaceta: alerta.documento_senado.gaceta || '',
        link_iniciativa: alerta.documento_senado.link_iniciativa || '',
        imagen_link: alerta.documento_senado.imagen_link || '',
        temas: alerta.documento_senado.temas || '',
        personas: alerta.documento_senado.personas || '',
        partidos: alerta.documento_senado.partidos || '',
        leyes: alerta.documento_senado.leyes || '',
        resumen: alerta.documento_senado.resumen || '',
        analisis: alerta.documento_senado.analisis || '',
        objeto: alerta.documento_senado.objeto || '',
        correspondiente: alerta.documento_senado.correspondiente || '',
        tipo: alerta.documento_senado.tipo || '',
        analizado: alerta.documento_senado.analizado || false
      })
    } else {
      // Inicializar con valores vacíos si no hay documento
      setDocumentoEditable({
        sinopsis: '',
        Proponente: '',
        iniciativa_texto: '',
        iniciativa_id: '',
        gaceta: '',
        link_iniciativa: '',
        imagen_link: '',
        temas: '',
        personas: '',
        partidos: '',
        leyes: '',
        resumen: '',
        analisis: '',
        objeto: '',
        correspondiente: '',
        tipo: '',
        analizado: false
      })
    }
    
    setShowValidarModal(true)
  }

  const verAlerta = (alerta: Alerta) => {
    setAlertaSeleccionada(alerta)
    setShowVerModal(true)
  }

  const eliminarAlerta = (alerta: Alerta) => {
    setAlertaSeleccionada(alerta)
    setShowDeleteModal(true)
  }

  // Función para actualizar el documento del senado
  const actualizarDocumentoSenado = async () => {
    if (!alertaSeleccionada?.id_doc_senado) {
      setError('No hay documento del senado vinculado para actualizar.')
      return false
    }

    try {
      const { error } = await supabase
        .from('senado')
        .update({
          sinopsis: documentoEditable.sinopsis || null,
          Proponente: documentoEditable.Proponente || null,
          iniciativa_texto: documentoEditable.iniciativa_texto || null,
          iniciativa_id: documentoEditable.iniciativa_id || null,
          gaceta: documentoEditable.gaceta || null,
          link_iniciativa: documentoEditable.link_iniciativa || null,
          imagen_link: documentoEditable.imagen_link || null,
          temas: documentoEditable.temas || null,
          personas: documentoEditable.personas || null,
          partidos: documentoEditable.partidos || null,
          leyes: documentoEditable.leyes || null,
          resumen: documentoEditable.resumen || null,
          analisis: documentoEditable.analisis || null,
          objeto: documentoEditable.objeto || null,
          correspondiente: documentoEditable.correspondiente || null,
          tipo: documentoEditable.tipo || null,
          analizado: documentoEditable.analizado
        })
        .eq('id_senado_doc', alertaSeleccionada.id_doc_senado)

      if (error) {
        console.error('Error actualizando documento:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error completo actualizando documento:', error)
      setError('Error al actualizar el documento del senado.')
      return false
    }
  }

  const aprobarAlerta = async () => {
    if (!alertaSeleccionada) return
    
    setLoading(true)
    try {
      // Primero actualizar el documento del senado si hay cambios
      if (alertaSeleccionada.id_doc_senado) {
        const documentoActualizado = await actualizarDocumentoSenado()
        if (!documentoActualizado) {
          // Si falló la actualización del documento, no continuar
          return
        }
      }

      // Luego actualizar el estado de la alerta
      const { error } = await supabase
        .from('alertas_directorio')
        .update({
          estado: 'enviadas',
          enviado_correo: true,
          datetime_enviado_correo: new Date().toISOString()
        })
        .eq('id_alerta', alertaSeleccionada.id_alerta)
      
      if (error) throw error
      
      setSuccessMessage('Alerta enviada correctamente al cliente.')
      setShowValidarModal(false)
      await loadAlertas()
      
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error) {
      console.error('Error aprobando alerta:', error)
      setError('No se pudo enviar la alerta.')
    } finally {
      setLoading(false)
    }
  }

  const rechazarAlerta = async () => {
    if (!alertaSeleccionada) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('alertas_directorio')
        .update({
          estado: 'rechazadas'
        })
        .eq('id_alerta', alertaSeleccionada.id_alerta)
      
      if (error) throw error
      
      setSuccessMessage('Alerta rechazada. No será enviada al cliente.')
      setShowValidarModal(false)
      await loadAlertas()
      
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error) {
      console.error('Error rechazando alerta:', error)
      setError('No se pudo rechazar la alerta.')
    } finally {
      setLoading(false)
    }
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

  // Cambiar de página
  const cambiarPagina = (nuevaPagina: number) => {
    setCurrentPage(nuevaPagina)
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

  // Descargar alerta en PDF (usando ventana imprimible)
  const descargarAlertaPDF = (alerta: Alerta) => {
    try {
      const tituloDoc = alerta.documento_senado?.sinopsis || 'Sinopsis no disponible'
      const proponente = alerta.documento_senado?.Proponente || 'N/A'
      const tipo = alerta.documento_senado?.tipo || 'N/A'
      const objeto = alerta.documento_senado?.objeto || 'N/A'
      const fechaDoc = alerta.documento_senado?.created_at
        ? new Date(alerta.documento_senado.created_at).toLocaleDateString('es-MX')
        : 'N/A'
      const enlace = alerta.documento_senado?.link_iniciativa || ''
      const temas = (alerta.temas_subtemas || []).join(', ')

      const w = window.open('', '_blank')
      if (!w) return

      w.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Alerta #${alerta.id_alerta} - ${alerta.nombre_cliente || ''}</title>
            <style>
              *{box-sizing:border-box;font-family:Calibri,Arial,Helvetica,sans-serif}
              body{margin:24px;color:#111}
              .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
              h1{font-size:20px;margin:0 0 4px 0}
              .meta{font-size:12px;color:#555}
              .section{margin-top:16px}
              .section h2{font-size:14px;margin:0 0 8px 0;color:#333;border-bottom:1px solid #eee;padding-bottom:4px}
              .kv{display:grid;grid-template-columns:160px 1fr;gap:6px 12px;font-size:13px}
              .kv div.label{color:#555}
              .box{background:#fafafa;border:1px solid #eee;border-radius:8px;padding:12px;font-size:13px;white-space:pre-wrap}
              .footer{margin-top:24px;font-size:12px;color:#777}
              @media print{.btn{display:none}}
              .btn{display:inline-block;margin-top:16px;padding:8px 12px;background:#D4133D;color:#fff;border-radius:6px;text-decoration:none}
              a{color:#0b57d0}
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1>Alerta #${alerta.id_alerta}</h1>
                <div class="meta">Cliente: <strong>${alerta.nombre_cliente || 'N/A'}</strong></div>
                <div class="meta">Estado: ${alerta.estado || 'N/A'} • Fuente: ${alerta.fuente || 'N/A'} • Creada: ${new Date(alerta.created_at).toLocaleDateString('es-MX')}</div>
              </div>
            </div>

            <div class="section">
              <h2>Documento</h2>
              <div class="kv">
                <div class="label">Tipo</div><div>${tipo}</div>
                <div class="label">Proponente</div><div>${proponente}</div>
                <div class="label">Fecha</div><div>${fechaDoc}</div>
                <div class="label">Temas/Subtemas</div><div>${temas || 'Sin temas'}</div>
              </div>
              <div class="box" style="margin-top:8px"><strong>Sinopsis</strong>\n${tituloDoc}</div>
              ${objeto ? `<div class="box" style="margin-top:8px"><strong>Objeto</strong>\n${objeto}</div>` : ''}
              ${enlace ? `<div class="section"><div class="label">Enlace</div><a href="${enlace}" target="_blank">${enlace}</a></div>` : ''}
            </div>

            <div class="footer">Generado automáticamente por GEP AI – ${new Date().toLocaleString('es-MX')}</div>
            <a class="btn" href="#" onclick="window.print();return false;">Imprimir/Guardar PDF</a>
          </body>
        </html>
      `)
      w.document.close()
      w.focus()
    } catch (e) {
      console.error('No se pudo generar el PDF de la alerta:', e)
      alert('No se pudo generar el PDF. Intenta de nuevo.')
    }
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
                ? 'bg-orange-600 text-white'
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
                ? 'bg-blue-600 text-white'
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
                <option value="Cámaras">Cámaras</option>
                <option value="DOF">DOF</option>
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
                        <div className="text-xs text-gray-500">
                          Cliente ID: {alerta.id_cliente.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-sm">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {alerta.documento_senado?.sinopsis || 'Sin documento vinculado'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {alerta.documento_senado?.Proponente && (
                            <span>Por: {alerta.documento_senado.Proponente}</span>
                          )}
                          {alerta.documento_senado?.tipo && (
                            <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                              {alerta.documento_senado.tipo}
                            </span>
                          )}
                        </div>
                        {alerta.documento_senado?.link_iniciativa && (
                          <div className="mt-1">
                            <a 
                              href={alerta.documento_senado.link_iniciativa}
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
                                className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
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
                          {activeTab === 'enviadas' && (
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
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando {alertasFiltradas.length > 0 ? (alertasFiltradas.length - (currentPage - 1) * alertasPorPagina) : 0} a {Math.min(alertasFiltradas.length, currentPage * alertasPorPagina)} de {alertasFiltradas.length} resultados
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => cambiarPagina(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => cambiarPagina(page)}
                      className={`px-3 py-1 border rounded-lg ${
                        page === currentPage
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => cambiarPagina(Math.min(totalPaginas, currentPage + 1))}
                    disabled={currentPage === totalPaginas}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Validación */}
      {showValidarModal && alertaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Validar Alerta #{alertaSeleccionada.id_alerta}
              </h3>
              <button
                onClick={() => setShowValidarModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* {errorValidacion && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{errorValidacion}</p>
                </div>
              )} */}

              {/* Información de la alerta */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-gray-900 mb-3">📋 Información de la Alerta</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Cliente:</span>
                    <div className="text-gray-900">{alertaSeleccionada.nombre_cliente}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Fecha de Creación:</span>
                    <div className="text-gray-900">{new Date(alertaSeleccionada.created_at).toLocaleDateString('es-MX')}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Temas y Subtemas:</span>
                    <div className="text-gray-900">{(alertaSeleccionada.temas_subtemas || []).join(', ')}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Destinatarios:</span>
                    <div className="text-gray-900">{alertaSeleccionada.listas_distribucion?.length || 0} correos</div>
                  </div>
                </div>
              </div>

              {/* Datos del Documento del Senado - NUEVA SECCIÓN */}
              {alertaSeleccionada.documento_senado && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    📄 Documento de Fuente 
                    <span className="ml-2 text-sm text-gray-500">(Editable)</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sinopsis */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sinopsis
                      </label>
                      <textarea
                        value={documentoEditable.sinopsis}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, sinopsis: e.target.value})}
                        className="form-input w-full h-20 resize-none"
                        placeholder="Sinopsis del documento"
                      />
                    </div>

                    {/* Proponente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Proponente
                      </label>
                      <input
                        type="text"
                        value={documentoEditable.Proponente}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, Proponente: e.target.value})}
                        className="form-input w-full"
                        placeholder="Nombre del proponente"
                      />
                    </div>

                    {/* Tipo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Documento
                      </label>
                      <input
                        type="text"
                        value={documentoEditable.tipo}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, tipo: e.target.value})}
                        className="form-input w-full"
                        placeholder="Tipo de documento"
                      />
                    </div>

                    {/* Objeto */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Objeto
                      </label>
                      <textarea
                        value={documentoEditable.objeto}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, objeto: e.target.value})}
                        className="form-input w-full h-16 resize-none"
                        placeholder="Objeto del documento"
                      />
                    </div>

                    {/* Link Iniciativa */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enlace de la Iniciativa
                      </label>
                      <input
                        type="url"
                        value={documentoEditable.link_iniciativa}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, link_iniciativa: e.target.value})}
                        className="form-input w-full"
                        placeholder="https://..."
                      />
                    </div>

                    {/* Gaceta */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gaceta
                      </label>
                      <input
                        type="text"
                        value={documentoEditable.gaceta}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, gaceta: e.target.value})}
                        className="form-input w-full"
                        placeholder="Información de gaceta"
                      />
                    </div>

                    {/* Temas */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Temas
                      </label>
                      <input
                        type="text"
                        value={documentoEditable.temas}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, temas: e.target.value})}
                        className="form-input w-full"
                        placeholder="Temas separados por coma"
                      />
                    </div>

                    {/* Personas */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Personas Involucradas
                      </label>
                      <input
                        type="text"
                        value={documentoEditable.personas}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, personas: e.target.value})}
                        className="form-input w-full"
                        placeholder="Personas involucradas"
                      />
                    </div>

                    {/* Partidos */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Partidos Políticos
                      </label>
                      <input
                        type="text"
                        value={documentoEditable.partidos}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, partidos: e.target.value})}
                        className="form-input w-full"
                        placeholder="Partidos políticos"
                      />
                    </div>

                    {/* Correspondiente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Correspondiente
                      </label>
                      <input
                        type="text"
                        value={documentoEditable.correspondiente}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, correspondiente: e.target.value})}
                        className="form-input w-full"
                        placeholder="Información correspondiente"
                      />
                    </div>

                    {/* Resumen */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resumen
                      </label>
                      <textarea
                        value={documentoEditable.resumen}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, resumen: e.target.value})}
                        className="form-input w-full h-20 resize-none"
                        placeholder="Resumen del documento"
                      />
                    </div>

                    {/* Análisis */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Análisis
                      </label>
                      <textarea
                        value={documentoEditable.analisis}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, analisis: e.target.value})}
                        className="form-input w-full h-24 resize-none"
                        placeholder="Análisis del documento"
                      />
                    </div>

                    {/* Campo de estado analizado */}
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={documentoEditable.analizado}
                          onChange={(e) => setDocumentoEditable({...documentoEditable, analizado: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Documento analizado
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

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
                  <textarea
                    value={mensajeAdjunto}
                    onChange={(e) => setMensajeAdjunto(e.target.value)}
                    className="form-input w-full h-24 resize-none"
                    placeholder="Mensaje adicional para el correo (opcional)"
                  />
                </div>
              </div>

              {/* Se eliminó la sección "📝 Datos del Documento" según la solicitud del usuario */}

              {/* Lista de destinatarios */}
              {alertaSeleccionada.listas_distribucion && alertaSeleccionada.listas_distribucion.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">📬 Destinatarios ({alertaSeleccionada.listas_distribucion.length})</h5>
                  <div className="text-sm text-blue-800 max-h-20 overflow-y-auto">
                    {alertaSeleccionada.listas_distribucion.join(', ')}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  onClick={() => setShowValidarModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={rechazarAlerta}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <XCircle size={16} />
                  {loading ? 'Rechazando...' : 'Rechazar'}
                </button>
                <button
                  onClick={aprobarAlerta}
                  disabled={loading || !asuntoCorreo.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                  {loading ? 'Enviando...' : 'Aprobar y Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ver Detalle */}
      {showVerModal && alertaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Detalle de Alerta Enviada
              </h3>
              <button
                onClick={() => setShowVerModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Información básica de la alerta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cliente</label>
                  <div className="text-gray-900 font-medium">{alertaSeleccionada.nombre_cliente}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Alerta</label>
                  <div className="text-gray-900">#{alertaSeleccionada.id_alerta}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Creación</label>
                  <div className="text-gray-900">
                    {new Date(alertaSeleccionada.created_at).toLocaleDateString('es-MX')}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <div className="text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      alertaSeleccionada.estado === 'pendientes' ? 'bg-yellow-100 text-yellow-800' :
                      alertaSeleccionada.estado === 'enviadas' ? 'bg-green-100 text-green-800' :
                      alertaSeleccionada.estado === 'rechazadas' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {alertaSeleccionada.estado}
                    </span>
                  </div>
                </div>
                {alertaSeleccionada.datetime_enviado_correo && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Envío</label>
                    <div className="text-gray-900">
                      {new Date(alertaSeleccionada.datetime_enviado_correo).toLocaleDateString('es-MX')}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fuente</label>
                  <div className="text-gray-900">{alertaSeleccionada.fuente || 'N/A'}</div>
                </div>
              </div>

              {/* Temas y Subtemas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Temas y Subtemas</label>
                <div className="flex flex-wrap gap-2">
                  {(alertaSeleccionada.temas_subtemas && alertaSeleccionada.temas_subtemas.length > 0) ? (
                    alertaSeleccionada.temas_subtemas.map((tema, index) => (
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
              {alertaSeleccionada.documento_senado && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    📄 Documento de Fuente de Extracción
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sinopsis */}
                    {alertaSeleccionada.documento_senado.sinopsis && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Sinopsis</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alertaSeleccionada.documento_senado.sinopsis}
                        </div>
                      </div>
                    )}

                    {/* Proponente */}
                    {alertaSeleccionada.documento_senado.Proponente && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Proponente</label>
                        <div className="text-gray-900 font-medium">{alertaSeleccionada.documento_senado.Proponente}</div>
                      </div>
                    )}

                    {/* Tipo */}
                    {alertaSeleccionada.documento_senado.tipo && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo</label>
                        <div className="text-gray-900">
                          <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            {alertaSeleccionada.documento_senado.tipo}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Objeto */}
                    {alertaSeleccionada.documento_senado.objeto && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Objeto</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alertaSeleccionada.documento_senado.objeto}
                        </div>
                      </div>
                    )}

                    {/* ID de Iniciativa */}
                    {alertaSeleccionada.documento_senado.iniciativa_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ID de Iniciativa</label>
                        <div className="text-gray-900">
                          <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {alertaSeleccionada.documento_senado.iniciativa_id}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Enlaces */}
                    {alertaSeleccionada.documento_senado.link_iniciativa && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Enlace Iniciativa</label>
                        <div className="mt-1">
                          <a 
                            href={alertaSeleccionada.documento_senado.link_iniciativa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            Ver documento original
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Imagen Link */}
                    {alertaSeleccionada.documento_senado.imagen_link && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Enlace de Imagen</label>
                        <div className="mt-1">
                          <a 
                            href={alertaSeleccionada.documento_senado.imagen_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            Ver imagen del documento
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Gaceta */}
                    {alertaSeleccionada.documento_senado.gaceta && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Gaceta</label>
                        <div className="text-gray-900">{alertaSeleccionada.documento_senado.gaceta}</div>
                      </div>
                    )}

                    {/* Temas del documento */}
                    {alertaSeleccionada.documento_senado.temas && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Temas del Documento</label>
                        <div className="text-gray-900">{alertaSeleccionada.documento_senado.temas}</div>
                      </div>
                    )}

                    {/* Personas */}
                    {alertaSeleccionada.documento_senado.personas && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Personas Involucradas</label>
                        <div className="text-gray-900">{alertaSeleccionada.documento_senado.personas}</div>
                      </div>
                    )}

                    {/* Partidos */}
                    {alertaSeleccionada.documento_senado.partidos && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Partidos</label>
                        <div className="text-gray-900">{alertaSeleccionada.documento_senado.partidos}</div>
                      </div>
                    )}

                    {/* Leyes */}
                    {alertaSeleccionada.documento_senado.leyes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Leyes</label>
                        <div className="text-gray-900">{alertaSeleccionada.documento_senado.leyes}</div>
                      </div>
                    )}

                    {/* Correspondiente */}
                    {alertaSeleccionada.documento_senado.correspondiente && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Correspondiente</label>
                        <div className="text-gray-900">{alertaSeleccionada.documento_senado.correspondiente}</div>
                      </div>
                    )}

                    {/* Resumen */}
                    {alertaSeleccionada.documento_senado.resumen && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Resumen</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alertaSeleccionada.documento_senado.resumen}
                        </div>
                      </div>
                    )}

                    {/* Iniciativa Texto */}
                    {alertaSeleccionada.documento_senado.iniciativa_texto && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Texto de la Iniciativa</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                          {alertaSeleccionada.documento_senado.iniciativa_texto}
                        </div>
                      </div>
                    )}

                    {/* Análisis */}
                    {alertaSeleccionada.documento_senado.analisis && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Análisis</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alertaSeleccionada.documento_senado.analisis}
                        </div>
                      </div>
                    )}

                    {/* Fecha de Creación del Documento */}
                    {alertaSeleccionada.documento_senado.created_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha de Creación del Documento</label>
                        <div className="text-gray-900">
                          {new Date(alertaSeleccionada.documento_senado.created_at).toLocaleDateString('es-MX')}
                        </div>
                      </div>
                    )}

                    {/* Estado de análisis */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Estado de Análisis</label>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          alertaSeleccionada.documento_senado.analizado 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {alertaSeleccionada.documento_senado.analizado ? 'Analizado' : 'Pendiente de análisis'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t space-x-2">
                <button
                  onClick={() => descargarAlertaPDF(alertaSeleccionada)}
                  className="px-6 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] transition-colors"
                >
                  Descargar PDF
                </button>
                <button
                  onClick={() => setShowVerModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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