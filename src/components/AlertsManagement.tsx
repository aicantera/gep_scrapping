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
import { ESTATUS_DOC_OPTIONS } from '../utils/SelectOptions'
import Select2 from './ui/select2'
import { useAuth } from '@/contexts/AuthContext'

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
  } | null

  enviado_por?: any;
}



const AlertsManagement: React.FC = () => {
  const { user } = useAuth();

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
  type TipoFuente = 'Cámaras' | 'DOF'

  const sources = [
    'Cámara de Diputados',
    'Cámara de Senadores',
    'Diario Oficial de la Federación'
  ];

  const docTypes: string[] = [
    'PUNTO DE ACUERDO',
    'INICIATIVA',
  ];


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
    analizado: false,
    transitorios: '',
    fuente: '',
    dependencia: '',
    ultimo_doc_expediente: '',
    ver_expediente: '',
    informacion_adicional: '',
    titulo: '',
    link_documento: ''
  })

  // Estados para clientes (usados en validación) - ELIMINANDO VARIABLES NO USADAS

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
        .order('created_at', { ascending: false })

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
  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id_cliente, nombre_cliente, siglas, email')
        .eq('activo', true)
      
      if (error) throw error
      return data || [];
    } catch (error) {
      console.error('Error cargando clientes:', error)
    }
  }

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
      
      // Filtro por fechas
      if (filterFecha.hasta && filterFecha.desde !== filterFecha.hasta) {        
        const fechaAlerta = new Date(alerta.created_at)
        const fechaHasta = new Date(filterFecha.hasta)
        if (fechaAlerta.getFullYear() > fechaHasta.getFullYear()) return false
        if (fechaAlerta.getMonth() > fechaHasta.getMonth()) return false
        if (fechaAlerta.getDate() > fechaHasta.getDate() + 1) return false
      }
      if (filterFecha.desde) {
        const fechaAlerta = new Date(alerta.created_at)
        const fechaDesde = new Date(filterFecha.desde)
        // Si las fechas desde y hasta son iguales, comparar solo el día
        if (filterFecha.hasta && (filterFecha.desde === filterFecha.hasta)) {
          const fechaAlertaStr = fechaAlerta.toISOString().split('T')[0]
          const fechaDesdeStr = fechaDesde.toISOString().split('T')[0]
          if (fechaAlertaStr !== fechaDesdeStr) return false
        } else {
          // Comparación normal para rango de fechas
          if (fechaAlerta.getFullYear() < fechaDesde.getFullYear()) return false
          if (fechaAlerta.getMonth() < fechaDesde.getMonth()) return false
          if (fechaAlerta.getDate() < fechaDesde.getDate()) return false
        }
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
    loadClientes()
  }, [])

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
        analizado: alerta.documento_senado.analizado || false,
        transitorios: alerta.documento_senado.transitorios || '',
        fuente: alerta.documento_senado.fuente || '',
        dependencia: alerta.documento_senado.dependencia || '',
        ultimo_doc_expediente: alerta.documento_senado.ultimo_doc_expediente || '',
        ver_expediente: alerta.documento_senado.ver_expediente || '',
        informacion_adicional: alerta.documento_senado.informacion_adicional || '',
        titulo: alerta.documento_senado.titulo || '',
        link_documento: alerta.documento_senado.link_documento || '',
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
        analizado: false,
        transitorios: '',
        fuente: '',
        dependencia: '',
        ultimo_doc_expediente: '',
        ver_expediente: '',
        informacion_adicional: '',
        titulo: '',
        link_documento: '',
      })
    }
    
    setShowValidarModal(true)
  }

  const verAlerta = async (alerta: Alerta) => {
    if (alerta.id_analista) {
      const { data: userFilter } = await supabase
        .from('usuarios')
        .select("*")
        .eq('user_id', alerta.id_analista)
        .single();

      setAlertaSeleccionada({ ...alerta, enviado_por: userFilter });
      setShowVerModal(true)
    } else {
      setAlertaSeleccionada(alerta)
      setShowVerModal(true)
    }
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
          analizado: documentoEditable.analizado,
          transitorios: documentoEditable.transitorios || null,
          fuente: documentoEditable.fuente || null,
          dependencia: documentoEditable.dependencia || null,
          ultimo_doc_expediente: documentoEditable.ultimo_doc_expediente || null,
          ver_expediente: documentoEditable.ver_expediente || null,
          informacion_adicional: documentoEditable.informacion_adicional || null,
          titulo: documentoEditable.titulo || null,
          link_documento: documentoEditable.link_documento || null
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
    
    // Validaciones según la fuente del documento
    switch(documentoEditable.fuente){
      case sources[2]: // DOF
        if(!documentoEditable.iniciativa_texto || !documentoEditable.fuente || !documentoEditable.temas || !documentoEditable.resumen || !documentoEditable.analisis) {
          alert('Todos los campos obligatorios deben estar completos para guardar los cambios.')
          return
        }
        break
      default: // Cámaras
        if (!documentoEditable.iniciativa_texto || !documentoEditable.tipo || !documentoEditable.objeto) {
          alert('Todos los campos obligatorios deben estar completos para guardar los cambios.')
          return
        }
        break
    }

    // Validaciones adicionales para tipos específicos con fuentes de Cámaras
    if(documentoEditable.tipo === docTypes[0] && (documentoEditable.fuente === sources[0] || documentoEditable.fuente === sources[1]) && (!documentoEditable.iniciativa_texto || !documentoEditable.tipo || !documentoEditable.personas || !documentoEditable.fuente || !documentoEditable.temas || !documentoEditable.objeto || !documentoEditable.analisis || !documentoEditable.resumen)) {
      alert('Todos los campos obligatorios deben estar completos para guardar los cambios.')
      return
    }
    if(documentoEditable.tipo === docTypes[1] && (documentoEditable.fuente === sources[0] || documentoEditable.fuente === sources[1]) && (!documentoEditable.iniciativa_texto || !documentoEditable.tipo || !documentoEditable.personas || !documentoEditable.fuente || !documentoEditable.temas || !documentoEditable.objeto || !documentoEditable.analisis)) {
      alert('Todos los campos obligatorios deben estar completos para guardar los cambios.')
      return
    }

    // Validar que el asunto del correo esté presente
    if (!asuntoCorreo.trim()) {
      alert('El asunto del correo es obligatorio.')
      return
    }
    
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
          estado: 'Enviado al Correo',
          enviado_correo: true,
          datetime_enviado_correo: new Date().toISOString(),
          asunto_email: asuntoCorreo,
          mensaje_email: mensajeAdjunto,
          id_analista: user?.id || null
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
          estado: 'rechazadas',
          id_analista: user?.id || null
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

  useEffect(() => {
    setAsuntoCorreo('');
    setMensajeAdjunto('');
  }, [alertaSeleccionada, documentoEditable]);

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
                    {/* Titulo */}
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título *
                      </label>
                      <input
                        type="text"
                        value={documentoEditable.titulo}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, titulo: e.target.value})}
                        className="form-input w-full"
                        placeholder="Título del documento"
                        required
                      />
                    </div>
                    {/* Tipo de proyecto - Solo mostrar si no es fuente[3] - NO EDITABLE */}
                    {documentoEditable.fuente !== sources[2] && (
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de Proyecto
                        </label>
                        <div className="form-input w-full bg-gray-100 text-gray-600">
                          {documentoEditable.tipo || 'No especificado'}
                        </div>
                      </div>
                    )}

                    {/* Proponente - Solo mostrar si no es fuente[3] */}
                    {documentoEditable.fuente !== sources[2] && (
                      <div className='col-span-1'>
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
                    )}

                    {/* Camara de origen / Órgano de difusión - NO EDITABLE */}
                    <div className='col-span-1'>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {documentoEditable.fuente === sources[2] ? "Órgano de difusión" : "Cámara de origen"}
                      </label>
                      <div className="form-input w-full bg-gray-100 text-gray-600">
                        {documentoEditable.fuente || 'No especificado'}
                      </div>
                    </div>

                    {/* Dependencia - Solo mostrar si es fuente[3] (DOF) */}
                    {documentoEditable.fuente === sources[2] && (
                      <div className='md:col-span-2'>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dependencia
                        </label>
                        <input
                          type="text"
                          value={documentoEditable.dependencia}
                          onChange={(e) => setDocumentoEditable({...documentoEditable, dependencia: e.target.value})}
                          className="form-input w-full"
                          placeholder="Dependencia"
                        />
                      </div>
                    )}

                    {/* Temas/Subtemas */}
                    <div className='md:col-span-2'>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Temas/Subtemas
                      </label>
                      <input
                        type="text"
                        value={documentoEditable.temas}
                        onChange={(e) => setDocumentoEditable({...documentoEditable, temas: e.target.value})}
                        className="form-input w-full"
                        placeholder="Temas/Subtemas"
                      />
                    </div>

                    {/* Objeto o Resumen según fuente */}
                    <div className="md:col-span-2">
                      {documentoEditable.fuente === sources[2] ? (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Resumen *
                          </label>
                          <textarea
                            value={documentoEditable.resumen}
                            onChange={(e) => setDocumentoEditable({...documentoEditable, resumen: e.target.value})}
                            className="form-input w-full h-24 resize-none"
                            placeholder="Resumen del documento"
                            required
                          />
                        </>
                      ) : (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Objeto *
                          </label>
                          <textarea
                            value={documentoEditable.objeto}
                            onChange={(e) => setDocumentoEditable({...documentoEditable, objeto: e.target.value})}
                            className="form-input w-full h-24 resize-none"
                            placeholder="Objeto del documento"
                            required
                          />
                        </>
                      )}
                    </div>

                    {/* Análisis o Correspondiente según fuente */}
                    <div className="md:col-span-2">
                      {documentoEditable.fuente === sources[2] || ((documentoEditable.fuente === sources[0] || documentoEditable.fuente === sources[1]) && (documentoEditable.tipo === docTypes[0] || documentoEditable.tipo === docTypes[1])) ? (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Análisis
                          </label>
                          <textarea
                            value={documentoEditable.analisis}
                            onChange={(e) => setDocumentoEditable({...documentoEditable, analisis: e.target.value})}
                            className="form-input w-full h-24 resize-none"
                            placeholder="Análisis del documento"
                          />
                        </>
                      ) : (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Correspondiente
                          </label>
                          <textarea
                            value={documentoEditable.sinopsis}
                            onChange={(e) => setDocumentoEditable({...documentoEditable, sinopsis: e.target.value})}
                            className="form-input w-full h-24 resize-none"
                            placeholder="Información correspondiente"
                          />
                        </>
                      )}
                    </div>



                    {/* Transitorios - Solo para fuentes que no sean DOF */}
                    {documentoEditable.fuente !== sources[2] && (
                      <div className="md:col-span-2">
                        {documentoEditable.tipo !== docTypes[0] && (
                          <>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Transitorios
                            </label>
                            <textarea
                              value={documentoEditable.transitorios}
                              onChange={(e) => setDocumentoEditable({...documentoEditable, transitorios: e.target.value})}
                              className="form-input w-full h-24 resize-none"
                              placeholder="Transitorios de la iniciativa o propuesta"
                            />
                          </>
                        )}
                      </div>
                    )}

                    {/* Estatus - Solo mostrar si no es fuente[2] (DOF) */}
                    {documentoEditable.fuente !== sources[2] && (
                      <div className="md:col-span-2">
                        <label className="form-label">Estatus</label>
                        {(documentoEditable.fuente === sources[0] || documentoEditable.fuente === sources[1] || documentoEditable.tipo === docTypes[0]) ? (
                          <Select2
                            value={documentoEditable.resumen}
                            onChange={(value) => setDocumentoEditable({...documentoEditable, resumen: value})}
                            options={ESTATUS_DOC_OPTIONS}
                            title="Seleccionar estatus del documento"
                            emptyOptionLabel="Sin estatus"
                          />
                        ) : (
                          <input
                            type="text"
                            value={documentoEditable.resumen}
                            onChange={(e) => setDocumentoEditable({...documentoEditable, resumen: e.target.value})}
                            className="form-input"
                            placeholder="Estatus de la iniciativa o propuesta"
                          />
                        )}
                      </div>
                    )}

                    {/* Información adicional - Solo para tipos específicos con fuentes de Cámaras */}
                    {((documentoEditable.tipo === docTypes[0] || documentoEditable.tipo === docTypes[1]) && (documentoEditable.fuente === sources[0] || documentoEditable.fuente === sources[1])) && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Información adicional
                        </label>
                        <textarea
                          value={documentoEditable.informacion_adicional}
                          onChange={(e) => setDocumentoEditable({...documentoEditable, informacion_adicional: e.target.value})}
                          className="form-input w-full h-24 resize-none"
                          placeholder="Información adicional del documento"
                        />
                      </div>
                    )}

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

                <div>
                  <label className="block text-sm font-medium text-gray-700">Enviado por:</label>
                  <div className="text-gray-900">
                    {`${alertaSeleccionada?.enviado_por?.nombre || 'N/A'}
                    ${alertaSeleccionada?.enviado_por?.apellido || 'N/A'}`}
                  </div>
                  <div className="text-gray-900">{alertaSeleccionada?.enviado_por?.email || 'N/A'}</div>
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
                    {/* Título */}
                    {alertaSeleccionada.documento_senado.titulo && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Título</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alertaSeleccionada.documento_senado.titulo}
                        </div>
                      </div>
                    )}

                    {/* Tipo de Proyecto - Solo mostrar si no es DOF */}
                    {alertaSeleccionada.documento_senado.fuente !== sources[2] && alertaSeleccionada.documento_senado.tipo && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo de Proyecto</label>
                        <div className="text-gray-900">
                          <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            {alertaSeleccionada.documento_senado.tipo}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Proponente - Solo mostrar si no es DOF */}
                    {alertaSeleccionada.documento_senado.fuente !== sources[2] && (alertaSeleccionada.documento_senado.Proponente || alertaSeleccionada.documento_senado.personas) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Proponente</label>
                        <div className="text-gray-900 font-medium">{alertaSeleccionada.documento_senado.Proponente || alertaSeleccionada.documento_senado.personas}</div>
                      </div>
                    )}

                    {/* Cámara de origen / Órgano de difusión */}
                    {alertaSeleccionada.documento_senado.fuente && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {alertaSeleccionada.documento_senado.fuente === sources[2] ? "Órgano de difusión" : "Cámara de origen"}
                        </label>
                        <div className="text-gray-900 font-medium">{alertaSeleccionada.documento_senado.fuente}</div>
                      </div>
                    )}

                    {/* Dependencia - Solo mostrar si es DOF */}
                    {alertaSeleccionada.documento_senado.fuente === sources[2] && alertaSeleccionada.documento_senado.dependencia && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Dependencia</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alertaSeleccionada.documento_senado.dependencia}
                        </div>
                      </div>
                    )}

                    {/* Temas/Subtemas */}
                    {alertaSeleccionada.documento_senado.temas && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Temas/Subtemas</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alertaSeleccionada.documento_senado.temas}
                        </div>
                      </div>
                    )}

                    {/* Objeto o Resumen según fuente */}
                    {alertaSeleccionada.documento_senado.fuente === sources[2] ? (
                      alertaSeleccionada.documento_senado.resumen && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Resumen</label>
                          <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                            {alertaSeleccionada.documento_senado.resumen}
                          </div>
                        </div>
                      )
                    ) : (
                      alertaSeleccionada.documento_senado.objeto && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Objeto</label>
                          <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                            {alertaSeleccionada.documento_senado.objeto}
                          </div>
                        </div>
                      )
                    )}

                    {/* Análisis o Correspondiente según fuente */}
                    {alertaSeleccionada.documento_senado.fuente === sources[2] || ((alertaSeleccionada.documento_senado.fuente === sources[0] || alertaSeleccionada.documento_senado.fuente === sources[1]) && (alertaSeleccionada.documento_senado.tipo === docTypes[0] || alertaSeleccionada.documento_senado.tipo === docTypes[1])) ? (
                      alertaSeleccionada.documento_senado.analisis && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Análisis</label>
                          <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                            {alertaSeleccionada.documento_senado.analisis}
                          </div>
                        </div>
                      )
                    ) : (
                      alertaSeleccionada.documento_senado.correspondiente && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Correspondiente</label>
                          <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                            {alertaSeleccionada.documento_senado.correspondiente}
                          </div>
                        </div>
                      )
                    )}



                    {/* Transitorios - Solo para fuentes que no sean DOF y tipos que no sean PUNTO DE ACUERDO */}
                    {alertaSeleccionada.documento_senado.fuente !== sources[2] && alertaSeleccionada.documento_senado.tipo !== docTypes[0] && alertaSeleccionada.documento_senado.transitorios && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Transitorios</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alertaSeleccionada.documento_senado.transitorios}
                        </div>
                      </div>
                    )}

                    {/* Estatus - Solo mostrar si no es DOF */}
                    {(alertaSeleccionada.documento_senado.fuente !== sources[2] && alertaSeleccionada.documento_senado.resumen) && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Estatus</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {(() => {
                            const resumen = alertaSeleccionada.documento_senado?.resumen;
                            if (!resumen) return '';
                            const matchedStatus = ESTATUS_DOC_OPTIONS.find(option => option.value === resumen);
                            return matchedStatus ? matchedStatus.label : resumen;
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Información adicional - Solo para tipos específicos con fuentes de Cámaras */}
                    {((alertaSeleccionada.documento_senado.tipo === docTypes[0] || alertaSeleccionada.documento_senado.tipo === docTypes[1]) && (alertaSeleccionada.documento_senado.fuente === sources[0] || alertaSeleccionada.documento_senado.fuente === sources[1])) && alertaSeleccionada.documento_senado.informacion_adicional && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Información adicional</label>
                        <div className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {alertaSeleccionada.documento_senado.informacion_adicional}
                        </div>
                      </div>
                    )}

                    {/* Enlaces adicionales */}
                    {alertaSeleccionada.documento_senado.link_iniciativa && (
                      <div className="md:col-span-2">
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

                    {/* Campos adicionales */}
                    {alertaSeleccionada.documento_senado.gaceta && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Gaceta</label>
                        <div className="text-gray-900">{alertaSeleccionada.documento_senado.gaceta}</div>
                      </div>
                    )}

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

                    {alertaSeleccionada.documento_senado.partidos && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Partidos</label>
                        <div className="text-gray-900">{alertaSeleccionada.documento_senado.partidos}</div>
                      </div>
                    )}

                    {alertaSeleccionada.documento_senado.leyes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Leyes</label>
                        <div className="text-gray-900">{alertaSeleccionada.documento_senado.leyes}</div>
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

                    {/* Fecha de Creación del Documento */}
                    {alertaSeleccionada.documento_senado.created_at && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Fecha de Creación del Documento</label>
                        <div className="text-gray-900">
                          {new Date(alertaSeleccionada.documento_senado.created_at).toLocaleDateString('es-MX')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t space-x-2">
                {alertaSeleccionada.link_pdf_enviado && (
                  <a
                    href={alertaSeleccionada.link_pdf_enviado}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] transition-colors"
                  >
                    Descargar PDF
                  </a>
                )}
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