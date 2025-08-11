import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  X,
  Save,
  RefreshCw,
  Building,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  UserX,
  Download
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRef } from 'react'

// Interfaces para temas y subtemas
interface Tema {
  id_tema: number
  created_at?: string
  nombre_tema: string
  desc_tema?: string
  id_usuario?: number
}

interface Subtema {
  id_subtema: number
  created_at?: string
  id_tema: number
  subtema_text: string
  subtema_desc?: string
}

interface Client {
  id_cliente: string
  nombre_cliente: string
  siglas: string | null
  logo: string | null
  listas_distribucion: ListaDistribucion[]
  temas_suscrit: string[] | null
  estado: string
  creado_en: string
  activo?: boolean
}

interface ListaDistribucion {
  id: string
  nombre: string
  temas_subtemas: string[]
  correos: string[]
}

interface ClientFormData {
  nombre_cliente: string
  siglas: string
  logo: string
  listas_distribucion: ListaDistribucion[]
  temas_suscrit: string[]
  estado: string
}

const ClientsManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [temas, setTemas] = useState<Tema[]>([])
  const [subtemas, setSubtemas] = useState<Subtema[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Estados para modales
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view' | 'delete' | 'toggle-status'>('create')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  
  // Estados para confirmación de cambio de estado
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [clientToToggle, setClientToToggle] = useState<Client | null>(null)
  
  // Estados para formulario
  const [formData, setFormData] = useState<ClientFormData>({
    nombre_cliente: '',
    siglas: '',
    logo: '',
    listas_distribucion: [],
    temas_suscrit: [],
    estado: 'activo'
  })

  // Estados para listas de distribución
  const [newLista, setNewLista] = useState<Omit<ListaDistribucion, 'id'>>({
    nombre: '',
    temas_subtemas: [],
    correos: ['']
  })
  
  // Estado para el filtro de temas/subtemas en el formulario de lista de distribución
  const [busquedaTemaSubtema, setBusquedaTemaSubtema] = useState('');
  // Búsqueda por lista para filtrar temas/subtemas en edición
  const [busquedaTemasPorLista, setBusquedaTemasPorLista] = useState<Record<string, string>>({})
  
  const ITEMS_PER_PAGE = 10

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadTemas()
    loadSubtemas()
    loadClients()
  }, [])

  // Cargar clientes cuando cambian los filtros
  useEffect(() => {
    loadClients()
  }, [currentPage, searchTerm])

  const loadTemas = async () => {
    try {
      console.log('🔄 Cargando temas...')
      
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .order('nombre_tema')
      
      if (error) {
        console.error('❌ Error cargando temas:', error)
        throw error
      }
      
      console.log('✅ Temas cargados:', data?.length || 0, data)
      setTemas(data || [])
    } catch (error) {
      console.error('❌ Error final cargando temas:', error)
      // Don't show error to user if themes fail, just log it
    }
  }

  const loadSubtemas = async () => {
    try {
      console.log('🔄 Cargando subtemas...')
      
      const { data, error } = await supabase
        .from('subtemas')
        .select('*')
        .order('subtema_text')
      
      if (error) {
        console.error('❌ Error cargando subtemas:', error)
        throw error
      }
      
      console.log('✅ Subtemas cargados:', data?.length || 0, data)
      setSubtemas(data || [])
    } catch (error) {
      console.error('❌ Error final cargando subtemas:', error)
      // Don't show error to user if themes fail, just log it
    }
  }

  const loadClients = async () => {
    setLoading(true)
    setError(null)
    
    try {
      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact' })
      
      // Aplicar búsqueda mejorada en todos los campos
      if (searchTerm.trim()) {
        const searchPattern = `%${searchTerm.trim().toLowerCase()}%`
        // Buscar solo en campos textuales soportados por el backend; el resto se filtra en front
        query = query.or(`
          nombre_cliente.ilike.${searchPattern},
          siglas.ilike.${searchPattern}
        `)
      }
      
      // Obtener conteo total
      const { count } = await query
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
      
      // Obtener datos paginados
      const { data, error } = await query
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)
        .order('creado_en', { ascending: false })
      
      if (error) throw error
      
      // Procesar los datos para parsear las listas de distribución y temas suscritos
      const processedClients = (data || []).map(client => {
        let listas_distribucion = []
        let temas_suscrit = []
        
        // Parsear listas de distribución si existe y es string
        if (client.listas_distribucion) {
          if (typeof client.listas_distribucion === 'string') {
            try {
              listas_distribucion = JSON.parse(client.listas_distribucion)
            } catch (e) {
              console.warn('Error parseando listas_distribucion para cliente:', client.id_cliente, e)
              listas_distribucion = []
            }
          } else if (Array.isArray(client.listas_distribucion)) {
            listas_distribucion = client.listas_distribucion
          }
        }
        
        // Parsear temas suscritos si existe y es string
        if (client.temas_suscrit) {
          if (typeof client.temas_suscrit === 'string') {
            try {
              temas_suscrit = JSON.parse(client.temas_suscrit)
            } catch (e) {
              console.warn('Error parseando temas_suscrit para cliente:', client.id_cliente, e)
              temas_suscrit = []
            }
          } else if (Array.isArray(client.temas_suscrit)) {
            temas_suscrit = client.temas_suscrit
          }
        }
        
        return {
          ...client,
          listas_distribucion,
          temas_suscrit
        }
      })
      
      console.log('✅ Clientes procesados:', processedClients.length, processedClients)
      setClients(processedClients)
    } catch (error) {
      console.error('Error cargando clientes:', error)
      setError('No se pudieron cargar los clientes.')
    } finally {
      setLoading(false)
    }
  }

  // Validar email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validar formulario
  const validateForm = (): string | null => {
    if (!formData.nombre_cliente.trim()) {
      return 'El nombre del cliente es obligatorio.'
    }
    
    // Validar que haya al menos una lista de distribución
    if (formData.listas_distribucion.length === 0) {
      return 'Debe agregar al menos una lista de distribución.'
    }

    // Validar cada lista de distribución
    for (const lista of formData.listas_distribucion) {
      if (!lista.nombre.trim()) {
        return 'Cada lista de distribución debe tener un nombre.'
      }
      
      if (lista.temas_subtemas.length === 0) {
        return `La lista "${lista.nombre}" debe tener al menos un tema o subtema asociado.`
      }
      
      if (lista.correos.length === 0 || lista.correos.every(correo => !correo.trim())) {
        return `La lista "${lista.nombre}" debe tener al menos un correo electrónico válido.`
      }
      
      for (const correo of lista.correos) {
        if (correo.trim() && !isValidEmail(correo.trim())) {
          return `El correo "${correo}" en la lista "${lista.nombre}" no tiene un formato válido.`
        }
      }
    }

    if (!formData.estado) {
      return 'Debes seleccionar un estado para el cliente.'
    }
    
    return null
  }

  // Verificar nombre duplicado
  const checkDuplicateName = async (nombre: string): Promise<boolean> => {
    try {
      let query = supabase
        .from('clientes')
        .select('nombre_cliente')
        .eq('nombre_cliente', nombre.trim());

      // Solo agregar el filtro si hay un cliente seleccionado (modo edición)
      if (selectedClient?.id_cliente) {
        query = query.neq('id_cliente', selectedClient.id_cliente);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error verificando duplicados:', error);
      return false;
    }
  };

  // Guardar cliente
  const saveClient = async () => {
    // Unir todos los temas y subtemas de las listas de distribución, sin duplicados
    const allTemasSubtemas = Array.from(new Set(
      formData.listas_distribucion.flatMap(lista => lista.temas_subtemas)
    ));
    // Actualizar formData.temas_suscrit antes de guardar
    const dataToSave = {
      ...formData,
      temas_suscrit: allTemasSubtemas
    };

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verificar nombre duplicado
      const isDuplicate = await checkDuplicateName(dataToSave.nombre_cliente);
      if (isDuplicate) {
        setError('Ya existe un cliente con ese nombre. Por favor utiliza un nombre distinto.');
        setLoading(false);
        return;
      }

      if (modalType === 'create') {
        const now = new Date().toISOString();
        const insertData = {
          nombre_cliente: dataToSave.nombre_cliente.trim(),
          siglas: dataToSave.siglas.trim() || null,
          logo: dataToSave.logo.trim() || null,
          listas_distribucion: JSON.stringify(dataToSave.listas_distribucion),
          temas_suscrit: dataToSave.temas_suscrit, // Guardar siempre como array
          estado: dataToSave.estado,
          creado_en: now
        };
        const { data, error } = await supabase
          .from('clientes')
          .insert(insertData)
          .select();

        console.log('📊 Resultado inserción:', { data, error });

        if (error) {
          console.error('❌ Error detallado al crear cliente:', error);
          throw error;
        }

        setSuccessMessage('Cliente registrado exitosamente.');
        setShowModal(false); // Cierra el modal
        await loadClients(); // Refresca la lista
        setTimeout(() => setSuccessMessage(''), 5000); // Oculta el mensaje después de 5s
        return;
      }
      if (!selectedClient) return;
      const updateData = {
        nombre_cliente: dataToSave.nombre_cliente.trim(),
        siglas: dataToSave.siglas.trim() || null,
        logo: dataToSave.logo.trim() || null,
        listas_distribucion: JSON.stringify(dataToSave.listas_distribucion),
        temas_suscrit: dataToSave.temas_suscrit, // Guardar siempre como array
        estado: dataToSave.estado
      };
      const { error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id_cliente', selectedClient.id_cliente);

      if (error) throw error;

      setSuccessMessage('Cliente actualizado exitosamente.');
      setShowModal(false);
      await loadClients();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('❌ Error final al guardar cliente:', error);
      setError('No se pudo guardar el cliente. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar cliente
  const deleteClient = async () => {
    if (!selectedClient) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id_cliente', selectedClient.id_cliente)
      
      if (error) throw error
      
      setSuccessMessage('Cliente eliminado correctamente.')
      closeModal()
      await loadClients()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error eliminando cliente:', error)
      setError('No se pudo eliminar el cliente. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // Mostrar modal de confirmación para cambiar estado del cliente
  const toggleClientStatus = (client: Client) => {
    setClientToToggle(client)
    setShowStatusModal(true)
  }

  // Ejecutar cambio de estado del cliente después de confirmación
  const confirmToggleClientStatus = async () => {
    if (!clientToToggle) return
    
    setLoading(true)
    setError(null)
    
    try {
      const newStatus = clientToToggle.estado === 'activo' ? 'inactivo' : 'activo'
      const { error } = await supabase
        .from('clientes')
        .update({ estado: newStatus })
        .eq('id_cliente', clientToToggle.id_cliente)
      
      if (error) throw error
      
      const message = newStatus === 'activo' 
        ? 'El cliente ha sido activado. Se reanudará el envío de alertas.'
        : 'El cliente ha sido desactivado. No recibirá nuevas alertas.'
      
      setSuccessMessage(message)
      setShowStatusModal(false)
      setClientToToggle(null)
      await loadClients()
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error) {
      console.error('Error cambiando estado:', error)
      setError('No se pudo actualizar el estado del cliente. Intenta nuevamente.')
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  // Cerrar modal de confirmación de estado
  const closeStatusModal = () => {
    setShowStatusModal(false)
    setClientToToggle(null)
    setError(null)
  }

  // Abrir modal
  const openModal = (type: typeof modalType, client?: Client) => {
    setModalType(type)
    setSelectedClient(client || null)
    setError(null)
    
    if (type === 'create') {
      setFormData({
        nombre_cliente: '',
        siglas: '',
        logo: '',
        listas_distribucion: [],
        temas_suscrit: [],
        estado: 'activo'
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Limpiar el input de archivo
      }
    } else if (client && (type === 'edit' || type === 'view')) {
      setFormData({
        nombre_cliente: client.nombre_cliente || '',
        siglas: client.siglas || '',
        logo: client.logo || '',
        listas_distribucion: Array.isArray(client.listas_distribucion) ? client.listas_distribucion : [],
        temas_suscrit: Array.isArray(client.temas_suscrit) ? client.temas_suscrit : [],
        estado: client.estado || 'activo'
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Limpiar el input de archivo
      }
    }
    
    setShowModal(true)
  }

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false)
    setSelectedClient(null)
    setError(null)
  }

  // Manejar búsqueda
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  // Actualiza el texto de búsqueda para una lista específica
  const handleBusquedaTemasLista = (listaId: string, value: string) => {
    setBusquedaTemasPorLista(prev => ({ ...prev, [listaId]: value }))
  }

  // Filtrar clientes - búsqueda mejorada en todos los campos relevantes
  const filteredClients = clients.filter(client => {
    if (!searchTerm.trim()) return true
    
    const searchLower = searchTerm.toLowerCase()
    
    // Buscar en nombre y siglas
    const matchesBasicInfo = (
      client.nombre_cliente.toLowerCase().includes(searchLower) ||
      client.siglas?.toLowerCase().includes(searchLower)
    )
    
    // Buscar en temas suscritos
    const matchesTemasSuscritos = client.temas_suscrit?.some(tema => 
      tema.toLowerCase().includes(searchLower)
    ) || false
    
    // Buscar en listas de distribución (temas/subtemas y correos)
    const matchesListasDistribucion = client.listas_distribucion?.some(lista => {
      // Buscar en nombre de la lista
      const matchesListaName = lista.nombre?.toLowerCase().includes(searchLower)
      
      // Buscar en temas/subtemas de la lista
      const matchesListaTemas = lista.temas_subtemas?.some(tema => 
        tema.toLowerCase().includes(searchLower)
      ) || false
      
      // Buscar en correos de la lista
      const matchesListaCorreos = lista.correos?.some(correo => 
        correo.toLowerCase().includes(searchLower)
      ) || false
      
      return matchesListaName || matchesListaTemas || matchesListaCorreos
    }) || false
    
    return matchesBasicInfo || matchesTemasSuscritos || matchesListasDistribucion
  })

  // Funciones para manejar listas de distribución
  const addListaDistribucion = () => {
    if (formData.listas_distribucion.length >= 30) {
      setError('No se pueden agregar más de 30 listas de distribución.')
      return
    }
    
    if (!newLista.nombre.trim()) {
      setError('El nombre de la lista es obligatorio.')
      return
    }
    
    if (newLista.temas_subtemas.length === 0) {
      setError('Debe seleccionar al menos un tema o subtema.')
      return
    }
    
    if (newLista.correos.length === 0 || newLista.correos.every(correo => !correo.trim())) {
      setError('Debe agregar al menos un correo electrónico válido.')
      return
    }
    
    const listaValida: ListaDistribucion = {
      id: Date.now().toString(),
      nombre: newLista.nombre.trim(),
      temas_subtemas: newLista.temas_subtemas,
      correos: newLista.correos.filter(correo => correo.trim())
    }
    
    setFormData(prev => ({
      ...prev,
      listas_distribucion: [...prev.listas_distribucion, listaValida]
    }))
    
    setNewLista({
      nombre: '',
      temas_subtemas: [],
      correos: ['']
    })
    
    setError(null)
  }

  const removeListaDistribucion = (id: string) => {
    setFormData(prev => ({
      ...prev,
      listas_distribucion: prev.listas_distribucion.filter(lista => lista.id !== id)
    }))
  }

  const addCorreoToLista = (listaId: string) => {
    setFormData(prev => ({
      ...prev,
      listas_distribucion: prev.listas_distribucion.map(lista => 
        lista.id === listaId 
          ? { ...lista, correos: [...lista.correos, ''] }
          : lista
      )
    }))
  }

  const removeCorreoFromLista = (listaId: string, correoIndex: number) => {
    setFormData(prev => ({
      ...prev,
      listas_distribucion: prev.listas_distribucion.map(lista => 
        lista.id === listaId 
          ? { ...lista, correos: lista.correos.filter((_, index) => index !== correoIndex) }
          : lista
      )
    }))
  }

  const updateCorreoInLista = (listaId: string, correoIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      listas_distribucion: prev.listas_distribucion.map(lista => 
        lista.id === listaId 
          ? { 
              ...lista, 
              correos: lista.correos.map((correo, index) => 
                index === correoIndex ? value : correo
              )
            }
          : lista
      )
    }))
  }

  // Función para actualizar el nombre de una lista de distribución
  const updateNombreEnLista = (listaId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      listas_distribucion: prev.listas_distribucion.map(lista => 
        lista.id === listaId 
          ? { ...lista, nombre: value }
          : lista
      )
    }))
  }

  // Función para agregar tema/subtema a una lista existente
  const addTemaSubtemaToLista = (listaId: string, temaSubtema: string) => {
    setFormData(prev => ({
      ...prev,
      listas_distribucion: prev.listas_distribucion.map(lista => 
        lista.id === listaId 
          ? { 
              ...lista, 
              temas_subtemas: [...lista.temas_subtemas, temaSubtema]
            }
          : lista
      )
    }))
  }

  // Función para quitar tema/subtema de una lista existente
  const removeTemaSubtemaFromLista = (listaId: string, temaSubtema: string) => {
    setFormData(prev => ({
      ...prev,
      listas_distribucion: prev.listas_distribucion.map(lista => 
        lista.id === listaId 
          ? { 
              ...lista, 
              temas_subtemas: lista.temas_subtemas.filter(ts => ts !== temaSubtema)
            }
          : lista
      )
    }))
  }

  // Función para subir el logo a Supabase Storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('logo').upload(fileName, file, { upsert: true });
    if (error) {
      setError('Error subiendo el logo.');
      return;
    }
    const { data: publicUrlData } = supabase.storage.from('logo').getPublicUrl(fileName);
    setFormData(prev => ({ ...prev, logo: publicUrlData.publicUrl }));
  };

  // Función para descargar listas de distribución en Excel
  const downloadListasDistribucion = async () => {
    if (!selectedClient || !formData.listas_distribucion.length) {
      setError('No hay listas de distribución para descargar.');
      return;
    }

    try {
      // Crear el contenido del Excel con formato mejorado
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Agregar encabezado con información del cliente
      csvContent += `REPORTE DE LISTAS DE DISTRIBUCIÓN\n`;
      csvContent += `=====================================\n\n`;
      csvContent += `INFORMACIÓN DEL CLIENTE:\n`;
      csvContent += `Cliente: ${formData.nombre_cliente}\n`;
      if (formData.siglas) {
        csvContent += `Siglas: ${formData.siglas}\n`;
      }
      csvContent += `Estado: ${formData.estado}\n`;
      if (formData.logo) {
        csvContent += `Logo: ${formData.logo}\n`;
      }
      csvContent += `Fecha de descarga: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}\n`;
      csvContent += `Total de listas: ${formData.listas_distribucion.length}\n\n`;
      
      // Encabezados de las columnas
      csvContent += 'LISTA DE DISTRIBUCIÓN,TEMAS Y SUBTEMAS,CORREOS ELECTRÓNICOS,TOTAL CORREOS\n';
      
      // Datos de cada lista
      formData.listas_distribucion.forEach(lista => {
        const temas = lista.temas_subtemas.join('; ');
        const correos = lista.correos.join('; ');
        const totalCorreos = lista.correos.length;
        csvContent += `"${lista.nombre}","${temas}","${correos}","${totalCorreos}"\n`;
      });
      
      // Agregar resumen al final
      csvContent += `\nRESUMEN:\n`;
      csvContent += `Total de listas: ${formData.listas_distribucion.length}\n`;
      const totalCorreos = formData.listas_distribucion.reduce((acc, lista) => acc + lista.correos.length, 0);
      csvContent += `Total de correos: ${totalCorreos}\n`;
      const totalTemas = formData.listas_distribucion.reduce((acc, lista) => acc + lista.temas_subtemas.length, 0);
      csvContent += `Total de temas/subtemas: ${totalTemas}\n`;
      
      // Crear y descargar el archivo
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      const fileName = `listas_distribucion_${formData.nombre_cliente.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessMessage(`✅ Listas de distribución descargadas correctamente: ${fileName}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error descargando listas:', error);
      setError('Error al descargar las listas de distribución.');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Clientes</h1>
          <p className="text-gray-600 mt-1">
            Administra los clientes y sus configuraciones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadClients()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#999996] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={() => openModal('create')}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] transition-colors"
          >
            <Plus size={20} />
            Nuevo Cliente
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

      {/* Búsqueda */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, siglas, temas, subtemas o correos"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="form-input pl-10 w-full"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">
              {searchTerm 
                ? 'No se encontraron clientes que coincidan con tu búsqueda.'
                : 'No hay clientes registrados. Registra el primer cliente para comenzar.'
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
                      Temas y subtemas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Registro
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
                  {filteredClients.map((client) => (
                    <tr key={client.id_cliente} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900" title={client.id_cliente}>
                          {client.id_cliente.substring(0, 8)}
                          {client.id_cliente.length > 8 && '...'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Building className="w-8 h-8 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {client.nombre_cliente || 'Sin nombre'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {client.siglas || 'Sin siglas'}
                            </div>
                            <div className="text-xs text-blue-600">
                              {(Array.isArray(client.listas_distribucion) && client.listas_distribucion.length > 0) ? (
                                <div className="flex flex-wrap gap-1">
                                  {client.listas_distribucion.map((lista, index) => (
                                    <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                      {lista?.nombre || 'Sin nombre'}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                'Sin listas de distribución'
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {(Array.isArray(client.temas_suscrit) && client.temas_suscrit.length > 0) ? (
                            <div className="flex flex-wrap gap-1">
                              {client.temas_suscrit.map((tema, index) => (
                                <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  {tema || 'Sin tema'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Sin temas asignados</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {client.creado_en ? new Date(client.creado_en).toLocaleDateString('es-MX') : 'Sin fecha'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                          client.estado === 'activo'
                            ? 'bg-green-100 text-green-800'
                            : client.estado === 'pendiente'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {client.estado || 'Sin estado'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openModal('view', client)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openModal('edit', client)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="Editar cliente"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => toggleClientStatus(client)}
                            className={`p-2 rounded-lg transition-colors ${
                              client.estado === 'activo'
                                ? 'text-orange-600 hover:bg-orange-100'
                                : 'text-green-600 hover:bg-green-100'
                            }`}
                            title={client.estado === 'activo' ? 'Desactivar' : 'Activar'}
                          >
                            {client.estado === 'activo' ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>
                          <button
                            onClick={() => openModal('delete', client)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Eliminar cliente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {modalType === 'create' && 'Nuevo Cliente'}
                {modalType === 'edit' && 'Editar Cliente'}
                {modalType === 'view' && 'Ver Detalles del Cliente'}
                {modalType === 'delete' && 'Confirmar Eliminación'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido del modal de eliminación */}
            {modalType === 'delete' && (
              <div className="text-center px-6 py-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  ¿Estás seguro?
                </h4>
                <p className="text-gray-600 mb-6">
                  Esta acción eliminará permanentemente al cliente "{selectedClient?.nombre_cliente}" 
                  y todas sus configuraciones asociadas. Esta acción no se puede deshacer.
                </p>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
                <div className="flex justify-center space-x-3 mb-8">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={deleteClient}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Eliminando...' : 'Eliminar Cliente'}
                  </button>
                </div>
              </div>
            )}

            {/* Contenido del modal para crear/editar/ver */}
            {modalType !== 'delete' && (
              <>
                <div className="px-6 py-4">
                  <div className="space-y-6">
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                      </div>
                    )}

                    {/* Previsualización del logo SIEMPRE visible si hay logo */}
                    {formData.logo ? (
                      <div className="flex justify-center mb-6">
                        <img src={formData.logo} alt="Logo del cliente" className="h-20 w-20 object-contain border rounded" />
                      </div>
                    ) : null}

                    {/* Información básica del cliente */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Información del Cliente</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre del Cliente *
                          </label>
                          <input
                            type="text"
                            value={formData.nombre_cliente}
                            onChange={(e) => setFormData(prev => ({ ...prev, nombre_cliente: e.target.value }))}
                            disabled={modalType === 'view'}
                            className="form-input w-full"
                            placeholder="Nombre del cliente"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Siglas (Opcional)
                          </label>
                          <input
                            type="text"
                            value={formData.siglas}
                            onChange={(e) => setFormData(prev => ({ ...prev, siglas: e.target.value }))}
                            disabled={modalType === 'view'}
                            className="form-input w-full"
                            placeholder="Siglas de la empresa"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logo (Opcional)
                          </label>
                          <div className="flex items-center gap-4">
                            <input
                              type="file"
                              accept="image/*"
                              ref={fileInputRef}
                              onChange={handleLogoUpload}
                              disabled={modalType === 'view'}
                              className="form-input w-full"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Estado *
                          </label>
                          <select
                            value={formData.estado}
                            onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                            disabled={modalType === 'view'}
                            className="form-input w-full"
                          >
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Información adicional del cliente (solo en modo view) */}
                    {modalType === 'view' && selectedClient && (
                      <div className="border-t pt-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Información Adicional del Cliente</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              ID del Cliente
                            </label>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <span className="text-sm font-mono text-gray-800">{selectedClient.id_cliente}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Fecha de Registro
                            </label>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <span className="text-sm text-gray-800">
                                {selectedClient.creado_en ? new Date(selectedClient.creado_en).toLocaleDateString('es-MX', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'No disponible'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Temas y Subtemas Suscritos (solo en modo view) */}
                    {modalType === 'view' && (
                      <div className="border-t pt-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Temas y Subtemas Suscritos</h4>
                        {formData.temas_suscrit && formData.temas_suscrit.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {formData.temas_suscrit.map((tema, index) => (
                                <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                  {tema}
                                </span>
                              ))}
                            </div>
                            <p className="text-sm text-gray-600">
                              Total de temas/subtemas suscritos: {formData.temas_suscrit.length}
                            </p>
                          </div>
                        ) : (
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-600 text-center">
                              No hay temas suscritos para este cliente
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Estadísticas del Cliente (solo en modo view) */}
                    {modalType === 'view' && (
                      <div className="border-t pt-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Estadísticas del Cliente</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="text-2xl font-bold text-blue-600">
                              {formData.listas_distribucion.length}
                            </div>
                            <div className="text-sm text-blue-800">Listas de Distribución</div>
                          </div>
                          
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="text-2xl font-bold text-green-600">
                              {formData.listas_distribucion.reduce((acc, lista) => acc + lista.correos.length, 0)}
                            </div>
                            <div className="text-sm text-green-800">Total de Correos</div>
                          </div>
                          
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <div className="text-2xl font-bold text-purple-600">
                              {(() => {
                                // Obtener todos los temas/subtemas únicos de las listas de distribución
                                const todosLosTemas = formData.listas_distribucion.flatMap(lista => lista.temas_subtemas);
                                // Eliminar duplicados
                                return [...new Set(todosLosTemas)].length;
                              })()}
                            </div>
                            <div className="text-sm text-purple-800">Temas y Subtemas</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Listas de Distribución */}
                    <div className="border-t pt-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">
                        Listas de Distribución ({formData.listas_distribucion.length})
                      </h4>
                      
                      {formData.listas_distribucion.length === 0 ? (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-sm text-gray-600 text-center">
                            No hay listas de distribución configuradas
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {formData.listas_distribucion.map((lista, index) => (
                            <div key={lista.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex-1">
                                  {modalType === 'edit' ? (
                                    <div className="space-y-2">
                                      <label className="block text-xs font-medium text-gray-700">
                                        Nombre de la Lista #{index + 1}
                                      </label>
                                      <input
                                        type="text"
                                        value={lista.nombre}
                                        onChange={(e) => updateNombreEnLista(lista.id, e.target.value)}
                                        className="form-input w-full"
                                        placeholder="Nombre de la lista"
                                      />
                                    </div>
                                  ) : (
                                    <h5 className="font-medium text-gray-800">
                                      Lista #{index + 1}: {lista.nombre}
                                    </h5>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    {lista.temas_subtemas.length} temas/subtemas • {lista.correos.length} correos
                                  </p>
                                </div>
                                {modalType !== 'view' && (
                                  <button
                                    type="button"
                                    onClick={() => removeListaDistribucion(lista.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Temas y Subtemas Asociados ({lista.temas_subtemas.length})
                                  </label>
                                  
                                  {modalType === 'edit' ? (
                                    <div className="space-y-3">
                                      {/* Temas/Subtemas existentes con opción de eliminar */}
                                      <div className="flex flex-wrap gap-1">
                                        {lista.temas_subtemas.length > 0 ? (
                                          lista.temas_subtemas.map((tema, temaIndex) => (
                                            <span key={temaIndex} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                              {tema}
                                              <button
                                                type="button"
                                                onClick={() => removeTemaSubtemaFromLista(lista.id, tema)}
                                                className="ml-1 text-blue-600 hover:text-blue-800"
                                              >
                                                <X size={12} />
                                              </button>
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-xs text-gray-500">Sin temas asignados</span>
                                        )}
                                      </div>
                                      
                                      {/* Selector para agregar nuevos temas/subtemas */}
                                      <div className="border-t pt-3">
                                        <label className="block text-xs font-medium text-gray-700 mb-2">
                                          Agregar Temas/Subtemas
                                        </label>
                                        {/* Filtro local para esta lista */}
                                        <input
                                          type="text"
                                          className="form-input mb-2 w-full"
                                          placeholder="Filtrar temas o subtemas..."
                                          value={busquedaTemasPorLista[lista.id] || ''}
                                          onChange={(e) => handleBusquedaTemasLista(lista.id, e.target.value)}
                                        />
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                          {temas
                                            .filter((tema) => {
                                              const q = (busquedaTemasPorLista[lista.id] || '').toLowerCase().trim()
                                              if (!q) return true
                                              const matchTema = tema.nombre_tema.toLowerCase().includes(q)
                                              const matchSubtema = subtemas.some(s => s.id_tema === tema.id_tema && s.subtema_text.toLowerCase().includes(q))
                                              return matchTema || matchSubtema
                                            })
                                            .map((tema) => {
                                              const temaSubtemas = subtemas.filter(s => s.id_tema === tema.id_tema);
                                              const temaSeleccionado = lista.temas_subtemas.includes(tema.nombre_tema);
                                              
                                              return (
                                                <div key={tema.id_tema} className="space-y-1">
                                                  {/* Tema principal */}
                                                  <div className="flex items-center gap-2">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        if (temaSeleccionado) {
                                                          removeTemaSubtemaFromLista(lista.id, tema.nombre_tema);
                                                        } else {
                                                          addTemaSubtemaToLista(lista.id, tema.nombre_tema);
                                                        }
                                                      }}
                                                      className={`w-4 h-4 rounded border ${
                                                        temaSeleccionado 
                                                          ? 'bg-blue-600 border-blue-600' 
                                                          : 'border-gray-300'
                                                      } flex items-center justify-center`}
                                                    >
                                                      {temaSeleccionado && (
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                      )}
                                                    </button>
                                                    <span className="font-medium text-gray-800 text-sm">{tema.nombre_tema}</span>
                                                  </div>
                                                  
                                                  {/* Subtemas */}
                                                  {temaSubtemas
                                                    .filter(st => {
                                                      const q = (busquedaTemasPorLista[lista.id] || '').toLowerCase().trim()
                                                      if (!q) return true
                                                      return st.subtema_text.toLowerCase().includes(q)
                                                    })
                                                    .map((st) => {
                                                      const subtemaSeleccionado = lista.temas_subtemas.includes(st.subtema_text);
                                                      
                                                      return (
                                                        <div key={st.id_subtema} className="flex items-center gap-2 ml-6">
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              if (subtemaSeleccionado) {
                                                                removeTemaSubtemaFromLista(lista.id, st.subtema_text);
                                                              } else {
                                                                addTemaSubtemaToLista(lista.id, st.subtema_text);
                                                              }
                                                            }}
                                                            className={`w-4 h-4 rounded border ${
                                                              subtemaSeleccionado 
                                                                ? 'bg-blue-600 border-blue-600' 
                                                                : 'border-gray-300'
                                                            } flex items-center justify-center`}
                                                          >
                                                            {subtemaSeleccionado && (
                                                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                              </svg>
                                                            )}
                                                          </button>
                                                          <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1">{st.subtema_text}</span>
                                                        </div>
                                                      );
                                                    })}
                                                </div>
                                              );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {lista.temas_subtemas.length > 0 ? (
                                        lista.temas_subtemas.map((tema, temaIndex) => (
                                          <span key={temaIndex} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {tema}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-xs text-gray-500">Sin temas asignados</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Correos Electrónicos ({lista.correos.length})
                                  </label>
                                  <div className="space-y-2">
                                    {lista.correos.length > 0 ? (
                                      lista.correos.map((correo, correoIndex) => (
                                        <div key={correoIndex} className="flex items-center gap-2">
                                          <input
                                            type="email"
                                            value={correo}
                                            onChange={(e) => updateCorreoInLista(lista.id, correoIndex, e.target.value)}
                                            disabled={modalType === 'view'}
                                            className="form-input flex-1"
                                            placeholder="correo@ejemplo.com"
                                          />
                                          {modalType !== 'view' && lista.correos.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => removeCorreoFromLista(lista.id, correoIndex)}
                                              className="text-red-600 hover:text-red-800"
                                            >
                                              <X size={14} />
                                            </button>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-xs text-gray-500">Sin correos configurados</span>
                                    )}
                                    {modalType !== 'view' && (
                                      <button
                                        type="button"
                                        onClick={() => addCorreoToLista(lista.id)}
                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                      >
                                        + Agregar correo
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Formulario para nueva lista */}
                      {modalType !== 'view' && formData.listas_distribucion.length < 30 && (
                        <div className="border-t pt-6 mt-6">
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Agregar nueva lista de distribución</h4>
                          {/* Campo para nombre de la lista */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la lista *</label>
                            <input
                              type="text"
                              className="form-input w-full"
                              placeholder="Nombre de la lista"
                              value={newLista.nombre}
                              onChange={e => setNewLista(prev => ({ ...prev, nombre: e.target.value }))}
                            />
                          </div>
                          {/* Campos para correos electrónicos */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Correos electrónicos *</label>
                            <div className="space-y-2">
                              {newLista.correos.map((correo, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="email"
                                    className="form-input flex-1"
                                    placeholder="correo@ejemplo.com"
                                    value={correo}
                                    onChange={e => {
                                      const value = e.target.value;
                                      setNewLista(prev => ({
                                        ...prev,
                                        correos: prev.correos.map((c, i) => i === idx ? value : c)
                                      }));
                                    }}
                                  />
                                  {newLista.correos.length > 1 && (
                                    <button
                                      type="button"
                                      className="text-red-600 hover:text-red-800"
                                      onClick={() => {
                                        setNewLista(prev => ({
                                          ...prev,
                                          correos: prev.correos.filter((_, i) => i !== idx)
                                        }));
                                      }}
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                                onClick={() => setNewLista(prev => ({ ...prev, correos: [...prev.correos, ''] }))}
                              >
                                + Agregar correo
                              </button>
                            </div>
                          </div>
                          {/* Buscador de temas y subtemas */}
                          <input
                            type="text"
                            placeholder="Buscar tema o subtema..."
                            className="form-input mb-3 w-full"
                            value={busquedaTemaSubtema}
                            onChange={e => setBusquedaTemaSubtema(e.target.value)}
                          />
                          {/* Listado filtrado de temas y subtemas con checkboxes */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {temas
                              .filter(tema => {
                                const search = busquedaTemaSubtema.toLowerCase();
                                const temaMatch = tema.nombre_tema.toLowerCase().includes(search);
                                const subtemasTema = subtemas.filter(s => s.id_tema === tema.id_tema);
                                const subtemaMatch = subtemasTema.some(st => st.subtema_text.toLowerCase().includes(search));
                                return !busquedaTemaSubtema || temaMatch || subtemaMatch;
                              })
                              .map(tema => {
                                const temaSubtemas = subtemas.filter(s => s.id_tema === tema.id_tema);
                                // Determinar si el tema está seleccionado
                                const temaSeleccionado = newLista.temas_subtemas.includes(tema.nombre_tema);
                                return (
                                  <div key={tema.id_tema} className="border border-gray-200 rounded-lg p-3">
                                    <label className="flex items-center mb-2">
                                      <input
                                        type="checkbox"
                                        checked={temaSeleccionado}
                                        onChange={e => {
                                          if (e.target.checked) {
                                            setNewLista(prev => ({
                                              ...prev,
                                              temas_subtemas: [...prev.temas_subtemas, tema.nombre_tema]
                                            }));
                                          } else {
                                            setNewLista(prev => ({
                                              ...prev,
                                              temas_subtemas: prev.temas_subtemas.filter(t => t !== tema.nombre_tema)
                                            }));
                                          }
                                        }}
                                        className="mr-2"
                                      />
                                      <span className="font-medium text-gray-800 text-sm">{tema.nombre_tema}</span>
                                    </label>
                                    <div className="flex flex-wrap gap-1 ml-5">
                                      {temaSubtemas.length > 0 ? (
                                        temaSubtemas.map(st => {
                                          const subtemaSeleccionado = newLista.temas_subtemas.includes(st.subtema_text);
                                          return (
                                            <label key={st.id_subtema} className="inline-flex items-center mr-2 mb-1">
                                              <input
                                                type="checkbox"
                                                checked={subtemaSeleccionado}
                                                onChange={e => {
                                                  if (e.target.checked) {
                                                    setNewLista(prev => ({
                                                      ...prev,
                                                      temas_subtemas: [...prev.temas_subtemas, st.subtema_text]
                                                    }));
                                                  } else {
                                                    setNewLista(prev => ({
                                                      ...prev,
                                                      temas_subtemas: prev.temas_subtemas.filter(t => t !== st.subtema_text)
                                                    }));
                                                  }
                                                }}
                                                className="mr-1"
                                              />
                                              <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1">{st.subtema_text}</span>
                                            </label>
                                          );
                                        })
                                      ) : (
                                        <span className="text-xs text-gray-400">No hay subtemas disponibles</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                          <button
                            type="button"
                            onClick={addListaDistribucion}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Agregar Lista de Distribución
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer del modal */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div>
                    {modalType === 'view' && formData.listas_distribucion.length > 0 && (
                      <button
                        onClick={downloadListasDistribucion}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        title="Descargar reporte completo con listas de distribución en Excel"
                      >
                        <Download size={16} />
                        Descargar Reporte Excel
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {modalType === 'view' ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {modalType !== 'view' && (
                      <button
                        onClick={saveClient}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save size={16} />
                        {loading ? 'Guardando...' : 'Guardar Cliente'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Estado */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="text-center mb-4">
              <AlertTriangle className={`w-16 h-16 mx-auto ${clientToToggle?.estado === 'activo' ? 'text-orange-600' : 'text-[#D4133D]'}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              ¿Estás seguro?
            </h3>
            <p className="text-gray-600 mb-6">
              Esta acción cambiará el estado del cliente "{clientToToggle?.nombre_cliente}" a "{clientToToggle?.estado === 'activo' ? 'inactivo' : 'activo'}".
              Esta acción no se puede deshacer.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <div className="flex justify-center space-x-3">
              <button
                onClick={closeStatusModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmToggleClientStatus}
                disabled={loading}
                className={`px-4 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                {loading ? 'Cambiando...' : (clientToToggle?.estado === 'activo' ? 'Desactivar' : 'Activar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientsManagement; 