import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Save,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Power,
  Eye
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Theme {
  id_tema: number // Auto-generado por PostgreSQL
  created_at: string
  nombre_tema: string
  desc_tema: string
  activo?: boolean
  subtemas?: Subtheme[]
}

// Tipo para crear un tema (sin ID - se genera automáticamente)
interface ThemeCreate {
  nombre_tema: string
  desc_tema: string
}

interface Subtheme {
  id_subtema: number // Auto-generado por PostgreSQL
  created_at: string
  id_tema: number
  subtema_text: string
  subtema_desc: string
}

// Tipo para crear un subtema (sin ID - se genera automáticamente)
interface SubthemeCreate {
  id_tema: number
  subtema_text: string
  subtema_desc: string
}

interface ThemeFormData {
  nombre_tema: string
  desc_tema: string
  subtemas: { subtema_text: string; subtema_desc: string }[]
}

interface ClienteRelacionado {
  id_cliente: string
  nombre_cliente: string
  temas_suscrit: string[]
}

interface DocumentoRelacionado {
  id_senado_doc: number
  temas: string
}

const ThemeManagement: React.FC = () => {
  const [themes, setThemes] = useState<Theme[]>([])
  const [allSubthemes, setAllSubthemes] = useState<Subtheme[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Estados para modales
  const [showThemeModal, setShowThemeModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [modalType, setModalType] = useState<'create' | 'edit'>('create')
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null)
  const [themeToToggle, setThemeToToggle] = useState<Theme | null>(null)
  const [nextStatusForToggle, setNextStatusForToggle] = useState<boolean>(false)
  
  // Estados para el formulario
  const [themeFormData, setThemeFormData] = useState<ThemeFormData>({
    nombre_tema: '',
    desc_tema: '',
    subtemas: []
  })
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Estados para detalles
  const [detailData, setDetailData] = useState<{
    clientes: ClienteRelacionado[]
    documentos: DocumentoRelacionado[]
    tema: Theme | null
  }>({
    clientes: [],
    documentos: [],
    tema: null
  })

  // Función para cargar todos los temas con sus subtemas
  const loadThemes = async () => {
    console.log('🔄 Iniciando carga de temas...')
    
    try {
      console.log('🔄 Cargando temas...')
      
      // Cargar temas
      const { data: themesData, error: themesError } = await supabase
        .from('temas')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (themesError) {
        console.error('❌ Error cargando temas:', themesError)
        throw themesError
      }
      
      // Cargar todos los subtemas
      const { data: subthemesData, error: subthemesError } = await supabase
        .from('subtemas')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (subthemesError) {
        console.error('❌ Error cargando subtemas:', subthemesError)
        throw subthemesError
      }
      
      // Procesar datos de temas
      const themesWithStatus = (themesData || []).map((theme) => ({
        ...theme,
        // Si el campo 'activo' existe en la BD, usarlo; si no, simular
        activo: theme.activo !== undefined ? theme.activo : (theme.id_tema % 3) !== 0
      }))
      
      setThemes(themesWithStatus)
      setAllSubthemes(subthemesData || [])
      console.log('✅ Temas cargados exitosamente:', themesWithStatus.length)
      console.log('✅ Subtemas cargados exitosamente:', (subthemesData || []).length)
      
      return true // Indicar éxito
      
    } catch (error) {
      console.error('❌ Error crítico cargando temas:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(`Error al cargar temas: ${errorMessage}`)
      return false // Indicar fallo
    }
  }

  // Función para obtener subtemas de un tema específico
  const getSubthemesByTheme = (themeId: number): Subtheme[] => {
    return allSubthemes.filter(subtema => subtema.id_tema === themeId)
  }

  // Función para verificar relaciones del tema
  const checkThemeRelations = async (theme: Theme) => {
    try {
      // Buscar clientes relacionados
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id_cliente, nombre_cliente, temas_suscrit')
      
      const relacionadosClientes = (clientes || []).filter((c: ClienteRelacionado) => 
        Array.isArray(c.temas_suscrit) && c.temas_suscrit.includes(theme.nombre_tema)
      )
      
      // Buscar documentos relacionados
      const { data: documentos } = await supabase
        .from('senado')
        .select('id_senado_doc, temas')
      
      const relacionadosDocs = (documentos || []).filter((d: DocumentoRelacionado) => 
        (d.temas || '').split(',').map((t: string) => t.trim()).includes(theme.nombre_tema)
      )
      
      return { relacionadosClientes, relacionadosDocs }
    } catch (error) {
      console.error('Error verificando relaciones:', error)
      return { relacionadosClientes: [], relacionadosDocs: [] }
    }
  }

    // Función para crear tema
  const createTheme = async () => {
    if (!themeFormData.nombre_tema.trim() || !themeFormData.desc_tema.trim()) {
      setError('El nombre y la descripción del tema son obligatorios.')
      return
    }
    
    // Validar subtemas si los hay
    const validSubthemes = themeFormData.subtemas.filter(st => 
      st.subtema_text.trim() && st.subtema_desc.trim()
    )
    
    if (themeFormData.subtemas.length > 0 && validSubthemes.length !== themeFormData.subtemas.length) {
      setError('Todos los subtemas deben tener nombre y descripción.')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Crear tema - PostgreSQL debe generar el ID automáticamente
      console.log('🚀 Creando tema SIN especificar ID:', {
        nombre_tema: themeFormData.nombre_tema.trim(),
        desc_tema: themeFormData.desc_tema.trim()
      })
      
      // Preparar datos para inserción (sin ID)
      const themeToCreate: ThemeCreate = {
        nombre_tema: themeFormData.nombre_tema.trim(),
        desc_tema: themeFormData.desc_tema.trim()
        // ✅ NO incluye id_tema - se genera automáticamente
      }

      const { data: tema, error: themeError } = await supabase
        .from('temas')
        .insert([themeToCreate])
        .select('*')
        .single()
      
      console.log('📄 Resultado de inserción:', { tema, error: themeError })
      
      if (themeError) {
        console.error('❌ Error al insertar tema:', themeError)
        throw themeError
      }
      
      if (!tema) {
        console.error('❌ No se recibió el tema creado')
        throw new Error('No se pudo obtener el tema creado')
      }
      
      console.log('✅ Tema creado exitosamente:', tema)
      
      // Crear subtemas si los hay
      let subtemasCreados = 0
      if (validSubthemes.length > 0) {
        try {
          // Preparar subtemas para inserción (sin ID - se genera automáticamente)
          const subtemasToInsert: SubthemeCreate[] = validSubthemes.map(st => ({
            id_tema: tema.id_tema,
            subtema_text: st.subtema_text.trim(),
            subtema_desc: st.subtema_desc.trim()
            // ✅ NO incluye id_subtema - se genera automáticamente
          }))
          
          console.log('🔄 Creando subtemas SIN especificar ID:', subtemasToInsert)
          
          const { data: subtemasData, error: subthemesError } = await supabase
            .from('subtemas')
            .insert(subtemasToInsert)
            .select('*')
          
          if (subthemesError) {
            console.error('❌ Error al crear subtemas:', subthemesError)
            
            // Manejo específico para error de clave duplicada en subtemas
            if (subthemesError.code === '23505') {
              console.error('🔧 ERROR DE SECUENCIA EN SUBTEMAS - ID NO DEBE SER ENVIADO')
              throw new Error(`Error de secuencia en subtemas. La tabla 'subtemas' tiene problemas de auto-incremento. 
              
🔧 SOLUCIÓN: Ejecuta en Supabase SQL Editor:
SELECT setval('subtemas_id_subtema_seq', (SELECT COALESCE(MAX(id_subtema), 0) FROM subtemas) + 1);`)
            }
            
            throw subthemesError
          }
          
          subtemasCreados = subtemasData?.length || 0
          console.log('✅ Subtemas creados exitosamente:', subtemasCreados)
        } catch (subthemeError) {
          console.error('❌ Error en creación de subtemas:', subthemeError)
          // No fallar toda la operación si solo fallan los subtemas
          const errorMessage = subthemeError instanceof Error ? subthemeError.message : 'Error desconocido'
          setError(`Tema creado, pero error al crear subtemas: ${errorMessage}`)
        }
      }
      
      // Actualizar UI
      console.log('🔄 Recargando lista de temas...')
      const reloadSuccess = await loadThemes()
      
      if (reloadSuccess) {
        console.log('✅ Lista de temas actualizada correctamente')
        setSuccessMessage(`✅ Tema "${tema.nombre_tema}" creado correctamente${subtemasCreados > 0 ? ` con ${subtemasCreados} subtemas` : ''}.`)
        setShowThemeModal(false)
        resetForm()
        
        setTimeout(() => setSuccessMessage(''), 5000)
      } else {
        console.warn('⚠️ Error al recargar lista, pero tema fue creado')
        setError('Tema creado exitosamente, pero error al actualizar la lista. Recarga la página manualmente.')
        setShowThemeModal(false)
        resetForm()
      }
    } catch (error) {
      console.error('Error creando tema:', error)
      
      // Manejo específico para error de clave duplicada
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        console.error('🔧 ERROR DE SECUENCIA DETECTADO - ID NO DEBE SER ENVIADO')
        console.error('Error completo:', error)
        
        setError(`❌ ERROR: El sistema está enviando un ID cuando debe ser auto-generado.

🔧 SOLUCIÓN INMEDIATA:
Verifica que la columna 'id_tema' en Supabase esté configurada como:
- Tipo: int8 o bigint
- Default: nextval('temas_id_tema_seq'::regclass)
- Es identidad: SÍ
- Auto-incremento: SÍ

📋 COMANDOS PARA EJECUTAR EN SUPABASE:

1. Verificar configuración actual:
   SELECT column_name, column_default, is_nullable, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'temas' AND column_name = 'id_tema';

2. Si falta auto-incremento, agregar:
   ALTER TABLE temas ALTER COLUMN id_tema SET DEFAULT nextval('temas_id_tema_seq');

3. Reiniciar secuencia:
   SELECT setval('temas_id_tema_seq', (SELECT COALESCE(MAX(id_tema), 0) FROM temas) + 1);

⚠️ El sistema NO debe enviar id_tema en el INSERT.`)
      } else {
        const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Error desconocido'
        setError(`No se pudo crear el tema: ${message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Función para actualizar tema
  const updateTheme = async () => {
    if (!selectedTheme || !themeFormData.nombre_tema.trim() || !themeFormData.desc_tema.trim()) {
      setError('El nombre y la descripción del tema son obligatorios.')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Actualizando tema:', selectedTheme.id_tema)
      
      // Actualizar tema
      const { error: themeError } = await supabase
        .from('temas')
        .update({
          nombre_tema: themeFormData.nombre_tema.trim(),
          desc_tema: themeFormData.desc_tema.trim()
        })
        .eq('id_tema', selectedTheme.id_tema)
      
      if (themeError) {
        console.error('❌ Error actualizando tema:', themeError)
        throw themeError
      }
      
      console.log('✅ Tema actualizado exitosamente')
      
      // Manejar subtemas
      const validSubthemes = themeFormData.subtemas.filter(st => 
        st.subtema_text.trim() && st.subtema_desc.trim()
      )
      
      if (validSubthemes.length > 0) {
        try {
          console.log('🔄 Eliminando subtemas existentes...')
          // Primero eliminar subtemas existentes
          const { error: deleteError } = await supabase
            .from('subtemas')
            .delete()
            .eq('id_tema', selectedTheme.id_tema)
          
          if (deleteError) {
            console.error('❌ Error eliminando subtemas existentes:', deleteError)
            throw deleteError
          }
          
          console.log('🔄 Creando nuevos subtemas...')
          // Crear nuevos subtemas (sin ID - se genera automáticamente)
          const subtemasToInsert: SubthemeCreate[] = validSubthemes.map(st => ({
            id_tema: selectedTheme.id_tema,
            subtema_text: st.subtema_text.trim(),
            subtema_desc: st.subtema_desc.trim()
            // ✅ NO incluye id_subtema - se genera automáticamente
          }))
          
          console.log('🔄 Insertando subtemas SIN especificar ID:', subtemasToInsert)
          
          const { data: subtemasData, error: subthemesError } = await supabase
            .from('subtemas')
            .insert(subtemasToInsert)
            .select('*')
          
          if (subthemesError) {
            console.error('❌ Error creando nuevos subtemas:', subthemesError)
            
            // Manejo específico para error de clave duplicada en subtemas
            if (subthemesError.code === '23505') {
              console.error('🔧 ERROR DE SECUENCIA EN SUBTEMAS - ID NO DEBE SER ENVIADO')
              throw new Error(`Error de secuencia en subtemas. La tabla 'subtemas' tiene problemas de auto-incremento. 
              
🔧 SOLUCIÓN: Ejecuta en Supabase SQL Editor:
SELECT setval('subtemas_id_subtema_seq', (SELECT COALESCE(MAX(id_subtema), 0) FROM subtemas) + 1);`)
            }
            
            throw subthemesError
          }
          
          const subtemasCreados = subtemasData?.length || 0
          console.log('✅ Subtemas actualizados exitosamente:', subtemasCreados)
          
        } catch (subthemeError) {
          console.error('❌ Error manejando subtemas:', subthemeError)
          const errorMessage = subthemeError instanceof Error ? subthemeError.message : 'Error desconocido'
          setError(`Tema actualizado, pero error con subtemas: ${errorMessage}`)
          setLoading(false)
          return
        }
      } else {
        // Si no hay subtemas válidos, eliminar los existentes
        console.log('🔄 Eliminando todos los subtemas (sin subtemas válidos)...')
        const { error: deleteAllError } = await supabase
          .from('subtemas')
          .delete()
          .eq('id_tema', selectedTheme.id_tema)
        
        if (deleteAllError) {
          console.error('❌ Error eliminando subtemas:', deleteAllError)
        } else {
          console.log('✅ Subtemas eliminados')
        }
      }
      
      // Recargar datos y actualizar UI
      const reloadSuccess = await loadThemes()
      
      if (reloadSuccess) {
        console.log('✅ Lista actualizada correctamente')
        setSuccessMessage(`✅ Tema "${themeFormData.nombre_tema}" actualizado correctamente.`)
        setShowThemeModal(false)
        resetForm()
        
        setTimeout(() => setSuccessMessage(''), 5000)
      } else {
        setError('Tema actualizado, pero error al recargar la lista. Recarga la página.')
        setShowThemeModal(false)
        resetForm()
      }
      
    } catch (error) {
      console.error('❌ Error actualizando tema:', error)
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Error desconocido'
      setError(`No se pudo actualizar el tema: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  // Función para eliminar tema
  const deleteTheme = async () => {
    if (!themeToDelete) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Verificar relaciones
      const { relacionadosClientes, relacionadosDocs } = await checkThemeRelations(themeToDelete)
      
      if (relacionadosClientes.length > 0 || relacionadosDocs.length > 0) {
        setError(`No se puede eliminar el tema "${themeToDelete.nombre_tema}" porque está relacionado con ${relacionadosClientes.length} cliente(s) y ${relacionadosDocs.length} documento(s).`)
        setLoading(false)
        return
      }
      
      // Eliminar subtemas primero
      const { error: subthemesError } = await supabase
        .from('subtemas')
        .delete()
        .eq('id_tema', themeToDelete.id_tema)
      
      if (subthemesError) throw subthemesError
      
      // Eliminar tema
      const { error: themeError } = await supabase
        .from('temas')
        .delete()
        .eq('id_tema', themeToDelete.id_tema)
      
      if (themeError) throw themeError
      
      setSuccessMessage(`Tema "${themeToDelete.nombre_tema}" eliminado correctamente.`)
      setShowDeleteModal(false)
      setThemeToDelete(null)
      await loadThemes()
      
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error eliminando tema:', error)
      setError('No se pudo eliminar el tema.')
    } finally {
      setLoading(false)
    }
  }

  // Función para cambiar estado activo/inactivo
  const toggleThemeStatus = async (theme: Theme) => {
    const newStatus = !theme.activo
    setLoading(true)
    setError(null)

    try {
      console.log('🔄 Cambiando estado del tema:', theme.id_tema, 'a', newStatus ? 'ACTIVO' : 'INACTIVO')
      
      // Actualizar estado en la base de datos
      const { error } = await supabase
        .from('temas')
        .update({ activo: newStatus })
        .eq('id_tema', theme.id_tema)
      
      if (error) {
        console.error('❌ Error actualizando estado:', error)
        
        // Si el campo 'activo' no existe en la tabla, usar una simulación
        if (error.code === '42703') { // Column does not exist
          console.warn('⚠️ Campo "activo" no existe en la tabla. Usando simulación.')
          setSuccessMessage(`⚠️ Tema "${theme.nombre_tema}" ${newStatus ? 'activado' : 'desactivado'} (simulado - campo "activo" no existe en BD).`)
        } else {
          throw error
        }
      } else {
        console.log('✅ Estado actualizado correctamente en la BD')
        setSuccessMessage(`✅ Tema "${theme.nombre_tema}" ${newStatus ? 'activado' : 'desactivado'} correctamente.`)
      }
      
      // Recargar datos para reflejar el cambio
      const reloadSuccess = await loadThemes()
      
      if (!reloadSuccess) {
        setError('Estado cambiado, pero error al recargar la lista. Recarga la página.')
      }
      
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error) {
      console.error('❌ Error cambiando estado del tema:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(`No se pudo cambiar el estado del tema: ${errorMessage}`)
    } finally {
      setLoading(false)
      setShowStatusModal(false)
      setThemeToToggle(null)
    }
  }

  // Función para ver detalles del tema
  const viewThemeDetails = async (theme: Theme) => {
    setLoading(true)
    setError(null)
    
    try {
      const { relacionadosClientes, relacionadosDocs } = await checkThemeRelations(theme)
      setDetailData({
        clientes: relacionadosClientes,
        documentos: relacionadosDocs,
        tema: theme
      })
      setSelectedTheme(theme)
      setShowDetailModal(true)
    } catch (error) {
      console.error('Error cargando detalles:', error)
      setError('No se pudieron cargar los detalles del tema.')
    } finally {
      setLoading(false)
    }
  }

  // Función para abrir modal de creación
  const openCreateModal = () => {
    setModalType('create')
    setSelectedTheme(null)
    resetForm()
    setShowThemeModal(true)
    setError(null)
  }

  // Función para abrir modal de edición
  const openEditModal = (theme: Theme) => {
    setModalType('edit')
    setSelectedTheme(theme)
    
    const subtemas = getSubthemesByTheme(theme.id_tema)
    setThemeFormData({
      nombre_tema: theme.nombre_tema,
      desc_tema: theme.desc_tema,
      subtemas: subtemas.map(st => ({
        subtema_text: st.subtema_text,
        subtema_desc: st.subtema_desc
      }))
    })
    
    setShowThemeModal(true)
    setError(null)
  }

  // Función para abrir modal de eliminación
  const openDeleteModal = (theme: Theme) => {
    setThemeToDelete(theme)
    setShowDeleteModal(true)
    setError(null)
  }

  // Abrir modal de confirmación para activar/desactivar
  const openStatusModal = (theme: Theme) => {
    setThemeToToggle(theme)
    setNextStatusForToggle(!theme.activo)
    setShowStatusModal(true)
    setError(null)
  }

  // Función para resetear formulario
  const resetForm = () => {
    setThemeFormData({
      nombre_tema: '',
      desc_tema: '',
      subtemas: []
    })
    setSelectedTheme(null)
  }

  // Función para agregar subtema al formulario
  const addSubthemeToForm = () => {
    setThemeFormData(prev => ({
      ...prev,
      subtemas: [...prev.subtemas, { subtema_text: '', subtema_desc: '' }]
    }))
  }

  // Función para remover subtema del formulario
  const removeSubthemeFromForm = (index: number) => {
    setThemeFormData(prev => ({
      ...prev,
      subtemas: prev.subtemas.filter((_, i) => i !== index)
    }))
  }

  // Función para actualizar subtema en el formulario
  const updateSubthemeInForm = (index: number, field: 'subtema_text' | 'subtema_desc', value: string) => {
    setThemeFormData(prev => ({
      ...prev,
      subtemas: prev.subtemas.map((st, i) => 
        i === index ? { ...st, [field]: value } : st
      )
    }))
  }

  // Filtrar temas
  const filteredThemes = themes.filter(theme => {
    const matchesSearch = searchTerm === '' || 
      theme.nombre_tema.toLowerCase().includes(searchTerm.toLowerCase()) ||
      theme.desc_tema.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getSubthemesByTheme(theme.id_tema).some(st => 
        st.subtema_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.subtema_desc.toLowerCase().includes(searchTerm.toLowerCase())
      )
    
    const matchesStatus = statusFilter === '' || 
      theme.activo === (statusFilter === 'activo')
    
    return matchesSearch && matchesStatus
  })

  // Calcular paginación
  const totalPages = Math.ceil(filteredThemes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentThemes = filteredThemes.slice(startIndex, endIndex)

  // Resetear página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  // Cargar datos iniciales
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      setError(null)
      try {
        console.log('🚀 Inicializando carga de datos...')
        const success = await loadThemes()
        if (!success) {
          console.error('❌ Falló la carga inicial de datos')
        }
      } catch (error) {
        console.error('❌ Error en inicialización:', error)
        setError('Error al cargar los datos iniciales')
      } finally {
        setLoading(false)
      }
    }
    
    initializeData()
  }, [])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Temas y Subtemas</h1>
          <p className="text-gray-600 mt-1">
            Administra el catálogo semántico del sistema de extracción
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadThemes()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#999996] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Crear Tema</span>
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
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-600 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por nombre, descripción o subtemas..."
                className="form-input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <select
              className="form-select w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de temas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Catálogo de Temas ({filteredThemes.length})
            </h2>
            {filteredThemes.length > 0 && (
              <span className="text-sm text-gray-500">
                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredThemes.length)} de {filteredThemes.length}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tema
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtemas Asociados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Registro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="animate-spin mr-2" size={20} />
                      <span className="text-gray-500">Cargando temas...</span>
                    </div>
                  </td>
                </tr>
              ) : currentThemes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="text-gray-500">
                      {searchTerm || statusFilter ? 
                        'No se encontraron temas que coincidan con los filtros.' :
                        'No hay temas registrados.'
                      }
                    </div>
                    {!searchTerm && !statusFilter && (
                      <button
                        onClick={openCreateModal}
                        className="mt-4 text-[#999996] hover:text-[#B52244] text-sm"
                      >
                        Crear el primer tema
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                currentThemes.map((theme) => {
                  const subtemas = getSubthemesByTheme(theme.id_tema)
                  return (
                    <tr key={theme.id_tema} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {theme.nombre_tema}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {theme.desc_tema}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {subtemas.length > 0 ? (
                            <div>
                              <div className="font-medium mb-1">
                                {subtemas.length} subtema{subtemas.length !== 1 ? 's' : ''}
                              </div>
                              <div className="space-y-1">
                                {subtemas.slice(0, 3).map((subtema) => (
                                  <div key={subtema.id_subtema} className="text-xs text-gray-600">
                                    • {subtema.subtema_text}
                                  </div>
                                ))}
                                {subtemas.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    ... y {subtemas.length - 3} más
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Sin subtemas</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(theme.created_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          theme.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {theme.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => viewThemeDetails(theme)}
                            className="p-2 text-[#999996] hover:bg-[#A1A3A5] rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => openEditModal(theme)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="Editar tema"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(theme)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Eliminar tema"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => openStatusModal(theme)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme.activo 
                                ? 'text-orange-600 hover:bg-orange-100' 
                                : 'text-green-600 hover:bg-green-100'
                            }`}
                            title={theme.activo ? 'Desactivar' : 'Activar'}
                          >
                            <Power size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="text-sm text-gray-500">
                {filteredThemes.length} tema{filteredThemes.length !== 1 ? 's' : ''} en total
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para crear/editar tema */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {modalType === 'create' ? 'Crear Nuevo Tema' : 'Editar Tema'}
              </h3>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                {/* Datos del tema */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Tema *
                    </label>
                    <input
                      type="text"
                      value={themeFormData.nombre_tema}
                      onChange={(e) => setThemeFormData(prev => ({ ...prev, nombre_tema: e.target.value }))}
                      className="form-input w-full"
                      placeholder="Ingresa el nombre del tema"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción del Tema *
                    </label>
                    <textarea
                      value={themeFormData.desc_tema}
                      onChange={(e) => setThemeFormData(prev => ({ ...prev, desc_tema: e.target.value }))}
                      rows={3}
                      className="form-input w-full resize-none"
                      placeholder="Describe el propósito y alcance del tema"
                    />
                  </div>
                </div>

                {/* Subtemas */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Subtemas Asociados
                    </label>
                    <button
                      type="button"
                      onClick={addSubthemeToForm}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-[#A1A3A5] text-black rounded-lg hover:bg-[#B52244] transition-colors"
                    >
                      <Plus size={14} />
                      Agregar Subtema
                    </button>
                  </div>

                  {themeFormData.subtemas.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 text-sm">No hay subtemas agregados</p>
                      <p className="text-gray-400 text-xs mt-1">Los subtemas son opcionales</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {themeFormData.subtemas.map((subtema, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">
                              Subtema {index + 1}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeSubthemeFromForm(index)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Nombre del Subtema
                              </label>
                              <input
                                type="text"
                                value={subtema.subtema_text}
                                onChange={(e) => updateSubthemeInForm(index, 'subtema_text', e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Nombre del subtema"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Descripción
                              </label>
                              <input
                                type="text"
                                value={subtema.subtema_desc}
                                onChange={(e) => updateSubthemeInForm(index, 'subtema_desc', e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Descripción del subtema"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowThemeModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={modalType === 'create' ? createTheme : updateTheme}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={16} />
                {loading ? 'Guardando...' : modalType === 'create' ? 'Crear Tema' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {showDetailModal && detailData.tema && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Detalles del Tema
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Información del Tema</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div>
                      <span className="text-xs font-medium text-gray-600">Nombre:</span>
                      <p className="text-sm text-gray-900">{detailData.tema.nombre_tema}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600">Descripción:</span>
                      <p className="text-sm text-gray-900">{detailData.tema.desc_tema}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600">Estado:</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        detailData.tema.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {detailData.tema.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600">Fecha de registro:</span>
                      <p className="text-sm text-gray-900">
                        {new Date(detailData.tema.created_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Subtemas Asociados</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedTheme ? (() => {
                      const subtemas = getSubthemesByTheme(selectedTheme.id_tema)
                      return subtemas.length > 0 ? (
                        <div className="space-y-3">
                          {subtemas.map(subtema => (
                            <div key={subtema.id_subtema} className="border-b border-gray-200 pb-2 last:border-b-0">
                              <p className="text-sm font-medium text-gray-900">{subtema.subtema_text}</p>
                              <p className="text-xs text-gray-600">{subtema.subtema_desc}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Sin subtemas asociados</p>
                      )
                    })() : (
                      <p className="text-sm text-gray-500">Sin subtemas asociados</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Relaciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Clientes Relacionados ({detailData.clientes.length})
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                    {detailData.clientes.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.clientes.map(cliente => (
                          <div key={cliente.id_cliente} className="text-sm text-gray-900">
                            • {cliente.nombre_cliente}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Sin clientes relacionados</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Documentos Relacionados ({detailData.documentos.length})
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                    {detailData.documentos.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.documentos.slice(0, 10).map(documento => (
                          <div key={documento.id_senado_doc} className="text-sm text-gray-900">
                            • Documento ID: {documento.id_senado_doc}
                          </div>
                        ))}
                        {detailData.documentos.length > 10 && (
                          <div className="text-xs text-gray-500">
                            ... y {detailData.documentos.length - 10} documentos más
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Sin documentos relacionados</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && themeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Confirmar Eliminación
              </h3>
            </div>

            <div className="px-6 py-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <p className="text-gray-700 mb-4">
                ¿Estás seguro de que deseas eliminar el tema <strong>"{themeToDelete.nombre_tema}"</strong>?
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Advertencia:</strong> Esta acción eliminará también todos los subtemas asociados y no se puede deshacer.
                </p>
              </div>

              <p className="text-sm text-gray-600">
                Se verificará que el tema no esté relacionado con clientes o documentos antes de proceder con la eliminación.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setThemeToDelete(null)
                  setError(null)
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deleteTheme}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={16} />
                {loading ? 'Eliminando...' : 'Eliminar Tema'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación Activar/Desactivar */}
      {showStatusModal && themeToToggle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {nextStatusForToggle ? 'Confirmar Activación' : 'Confirmar Desactivación'}
              </h3>
            </div>
            <div className="px-6 py-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              <p className="text-gray-700 mb-4">
                ¿Deseas {nextStatusForToggle ? 'activar' : 'desactivar'} el tema <strong>"{themeToToggle.nombre_tema}"</strong>?
              </p>
              {!nextStatusForToggle && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 text-sm">
                    Puedes reactivar el tema en cualquier momento. Los subtemas y relaciones se conservan.
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowStatusModal(false)
                  setThemeToToggle(null)
                  setError(null)
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => themeToToggle && toggleThemeStatus(themeToToggle)}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  nextStatusForToggle ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {nextStatusForToggle ? 'Activar' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThemeManagement 