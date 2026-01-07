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
  Power,
  Download
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRef } from 'react'
import ExcelJS from 'exceljs';
import clsx from 'clsx';

// Interfaces para temas y subtemas
interface Tema {
  id_tema: number
  created_at?: string
  nombre_tema: string
  desc_tema?: string
  id_usuario?: number
  id_gep: number
}

interface Subtema {
  id_subtema: number
  created_at?: string
  id_tema: number
  subtema_text: string
  subtema_desc?: string
  id_gep: number
}

// Nueva interfaz para contactos de email
interface EmailContact {
  nombre: string
  correo: string
}

interface Client {
  id_cliente: string
  id_cliente_numerico?: number
  nombre_cliente: string
  siglas: string | null
  logo: string | null
  listas_distribucion: ListaDistribucion[]
  temas_suscrit: TemaSubtemaGuardado[] | null
  estado: string
  creado_en: string
  activo?: boolean
}

interface ListaDistribucion {
  id: string
  nombre: string
  temas_subtemas: TemaSubtemaGuardado[]
  correos: EmailContact[]
}

interface TemaSubtemaGuardado {
  nombre_tema?: string
  subtema_text?: string
  id_gep: number
  id: number  // id_tema para temas, id_subtema para subtemas - usado para validación única
}

interface ClientFormData {
  nombre_cliente: string
  siglas: string
  logo: string
  listas_distribucion: ListaDistribucion[]
  temas_suscrit: TemaSubtemaGuardado[]
  estado: string
}

// Función helper para convertir string a objeto (retrocompatibilidad)
const convertirStringAObjeto = (str: string, temas: Tema[], subtemas: Subtema[]): TemaSubtemaGuardado | null => {
  // Buscar en temas
  const tema = temas.find(t => t.nombre_tema === str)
  if (tema) {
    return { nombre_tema: tema.nombre_tema, id_gep: tema.id_gep, id: tema.id_tema }
  }
  
  // Buscar en subtemas
  const subtema = subtemas.find(s => s.subtema_text === str)
  if (subtema) {
    return { subtema_text: subtema.subtema_text, id_gep: subtema.id_gep, id: subtema.id_subtema }
  }
  
  return null
}

// Función helper para convertir array de strings a objetos
const convertirArrayAObjetos = (arr: any[], temas: Tema[], subtemas: Subtema[]): TemaSubtemaGuardado[] => {
  return arr
    .map(item => {
      // Si ya es un objeto con la estructura correcta (tiene id_gep e id), retornarlo
      if (typeof item === 'object' && item !== null && 'id_gep' in item && 'id' in item) {
        return item as TemaSubtemaGuardado
      }
      // Si es string, puede ser un string JSON o un string simple
      if (typeof item === 'string') {
        // Si parece ser JSON (empieza con {), intentar parsearlo
        if (item.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(item)
            // Verificar que el objeto parseado tenga la estructura correcta
            if (parsed && typeof parsed === 'object' && 'id_gep' in parsed && 'id' in parsed) {
              return parsed as TemaSubtemaGuardado
            }
          } catch (e) {
            // Si falla el parse, continuar como string simple
          }
        }
        // Si es un string simple (nombre de tema/subtema), convertirlo usando la función helper
        return convertirStringAObjeto(item, temas, subtemas)
      }
      return null
    })
    .filter((item): item is TemaSubtemaGuardado => item !== null)
}

const ClientsManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [temas, setTemas] = useState<Tema[]>([])
  const [subtemas, setSubtemas] = useState<Subtema[]>([])
  const [loading, setLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [modalSuccessMessage, setModalSuccessMessage] = useState<string | null>(null)
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
    correos: [{nombre: '', correo: ''}]
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
      
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .order('nombre_tema')
      
      if (error) {
        console.error('❌ Error cargando temas:', error)
        throw error
      }
      
      setTemas(data || [])
    } catch (error) {
      console.error('❌ Error final cargando temas:', error)
      // Don't show error to user if themes fail, just log it
    }
  }

  const loadSubtemas = async () => {
    try {
      
      const { data, error } = await supabase
        .from('subtemas')
        .select('*')
        .order('subtema_text')
      
      if (error) {
        console.error('❌ Error cargando subtemas:', error)
        throw error
      }
      setSubtemas(data || [])
    } catch (error) {
      console.error('❌ Error final cargando subtemas:', error)
      // Don't show error to user if themes fail, just log it
    }
  }

  const loadClients = async () => {
    setLoading(true)
    
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
        .order('id_cliente_numerico', { ascending: false })
      
      if (error) throw error
      
      // Procesar los datos para parsear las listas de distribución y temas suscritos
      const processedClients = (data || []).map(client => {
        let listas_distribucion: ListaDistribucion[] = []
        let temas_suscrit: TemaSubtemaGuardado[] = []
        
        // Parsear listas de distribución si existe y es string
        if (client.listas_distribucion) {
          if (typeof client.listas_distribucion === 'string') {
            try {
              listas_distribucion = JSON.parse(client.listas_distribucion)
              listas_distribucion = listas_distribucion.map((lista: any) => {
                // Convertir temas_subtemas de strings a objetos si es necesario
                if (Array.isArray(lista.temas_subtemas)) {
                  lista.temas_subtemas = convertirArrayAObjetos(lista.temas_subtemas, temas, subtemas)
                }
                lista.correos = lista.correos.map((correo: any) => {
                  if(correo?.nombre) {
                    return correo
                  } else {
                    return {
                      nombre: '',
                      correo: correo
                    }
                  }
                })
                return lista
              })
            } catch (e) {
              console.warn('Error parseando listas_distribucion para cliente:', client.id_cliente, e)
              listas_distribucion = []
            }
          } else if (Array.isArray(client.listas_distribucion)) {
            listas_distribucion = client.listas_distribucion.map((lista: any) => ({
              ...lista,
              temas_subtemas: convertirArrayAObjetos(lista.temas_subtemas || [], temas, subtemas)
            }))
          }
        }
        
        // Parsear temas suscritos si existe
        if (client.temas_suscrit) {
          if (typeof client.temas_suscrit === 'string') {
            // Si es un string JSON, parsearlo primero
            try {
              const parsed = JSON.parse(client.temas_suscrit)
              temas_suscrit = convertirArrayAObjetos(parsed, temas, subtemas)
            } catch (e) {
              console.warn('Error parseando temas_suscrit para cliente:', client.id_cliente, e)
              temas_suscrit = []
            }
          } else if (Array.isArray(client.temas_suscrit)) {
            // Si es un array, verificar si cada elemento es un string JSON o un string simple
            temas_suscrit = client.temas_suscrit.map((item: any) => {
              // Si el elemento es un string que parece JSON (empieza con {), parsearlo
              if (typeof item === 'string' && item.trim().startsWith('{')) {
                try {
                  return JSON.parse(item) as TemaSubtemaGuardado
                } catch (e) {
                  // Si falla el parse, tratarlo como string simple
                  return item
                }
              }
              // Si ya es un objeto, retornarlo directamente
              if (typeof item === 'object' && item !== null) {
                return item
              }
              // Si es un string simple, retornarlo para conversión posterior
              return item
            })
            // Convertir todos los elementos a objetos usando la función helper
            temas_suscrit = convertirArrayAObjetos(temas_suscrit, temas, subtemas)
          }
        }
        
        return {
          ...client,
          listas_distribucion,
          temas_suscrit
        }
      })
      
      setClients(processedClients)
    } catch (error) {
      console.error('Error cargando clientes:', error)
      // Los errores de carga se manejan silenciosamente para no interrumpir la UI
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
    let errorMessage = ''
    if (!formData.nombre_cliente.trim()) {
      errorMessage = 'El nombre del cliente es obligatorio.'
    }
    
    // Validar que haya al menos una lista de distribución
    if (formData.listas_distribucion.length === 0) {
      errorMessage = 'Debe agregar al menos una lista de distribución.'
    }

    // Validar cada lista de distribución
    for (const lista of formData.listas_distribucion) {
      if (!lista.nombre.trim()) {
        errorMessage = 'Cada lista de distribución debe tener un nombre.'
      }
      
      if (lista.temas_subtemas.length === 0) {
        errorMessage = `La lista "${lista.nombre}" debe tener al menos un tema o subtema asociado.`
      }
      
      if (lista.correos.length === 0 || lista.correos.every(correo => !correo.correo.trim())) {
        errorMessage = `La lista "${lista.nombre}" debe tener al menos un correo electrónico válido.`
      }
      for (const correo of lista.correos) {
        if (correo.correo.trim() === '' || !isValidEmail(correo.correo.trim())) {
          errorMessage = `El correo "${correo.correo}" en la lista "${lista.nombre}" no tiene un formato válido.`
        }
        if(correo.nombre.trim() === '') {
          errorMessage = `El nombre del correo "${correo.correo}" en la lista "${lista.nombre}" no puede estar vacío.`
        }
      }
    }

    if (!formData.estado) {
      errorMessage = 'Debes seleccionar un estado para el cliente.'
    }
    return errorMessage !== '' ? errorMessage : null
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
    // Usar id único para evitar duplicados
    const allTemasSubtemas: TemaSubtemaGuardado[] = []
    const seenIds = new Set<number>()
    
    formData.listas_distribucion.forEach(lista => {
      lista.temas_subtemas.forEach(item => {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id)
          allTemasSubtemas.push(item)
        }
      })
    })
    
    // Actualizar formData.temas_suscrit antes de guardar
    const dataToSave = {
      ...formData,
      temas_suscrit: allTemasSubtemas
    };

    const validationError = validateForm();
    if (validationError) {
      setModalError(validationError);
      return;
    }

    setLoading(true);
    setModalError(null);

    try {
      // Verificar nombre duplicado
      const isDuplicate = await checkDuplicateName(dataToSave.nombre_cliente);
      if (isDuplicate) {
        setModalError('Ya existe un cliente con ese nombre. Por favor utiliza un nombre distinto.');
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
          temas_suscrit: dataToSave.temas_suscrit, // Guardar como array de objetos
          estado: dataToSave.estado,
          creado_en: now
        };
        const { data, error } = await supabase
          .from('clientes')
          .insert(insertData)
          .select();

        if (error) {
          console.error('❌ Error detallado al crear cliente:', error);
          throw error;
        }

        setSuccessMessage('Cliente registrado exitosamente.');
        setShowModal(false); // Cierra el modal
        await loadClients(); // Refresca la lista
        setTimeout(() => setSuccessMessage(''), 5000); // Oculta el mensaje después de 5s
        return data;
      }
      if (!selectedClient) return;
      const updateData = {
        nombre_cliente: dataToSave.nombre_cliente.trim(),
        siglas: dataToSave.siglas.trim() || null,
        logo: dataToSave.logo.trim() || null,
        listas_distribucion: JSON.stringify(dataToSave.listas_distribucion),
        temas_suscrit: dataToSave.temas_suscrit, // Guardar como array de objetos
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
      setModalError('No se pudo guardar el cliente. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar cliente
  const deleteClient = async () => {
    if (!selectedClient) return
    
    setLoading(true)
    setModalError(null)
    
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
      setModalError('No se pudo eliminar el cliente. Intenta nuevamente.')
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
    setModalError(null)
    
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
      setModalError('No se pudo actualizar el estado del cliente. Intenta nuevamente.')
      setTimeout(() => setModalError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  // Cerrar modal de confirmación de estado
  const closeStatusModal = () => {
    setShowStatusModal(false)
    setClientToToggle(null)
    setModalError(null)
  }

  // Abrir modal
  const openModal = (type: typeof modalType, client?: Client) => {
    setModalType(type)
    setSelectedClient(client || null)
    setModalError(null)
    
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
    setModalError(null)
    setModalSuccessMessage(null)    
    setNewLista({
      nombre: '',
      temas_subtemas: [],
      correos: [{nombre: '', correo: ''}]
    })
    setBusquedaTemaSubtema('')
    setBusquedaTemasPorLista({})
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
    const matchesTemasSuscritos = client.temas_suscrit?.some(tema => {
      const texto = typeof tema === 'string' ? tema : obtenerTexto(tema)
      return texto.toLowerCase().includes(searchLower)
    }) || false
    
    // Buscar en listas de distribución (temas/subtemas y correos)
    const matchesListasDistribucion = client.listas_distribucion?.some(lista => {
      // Buscar en nombre de la lista
      const matchesListaName = lista.nombre?.toLowerCase().includes(searchLower)
      
      // Buscar en temas/subtemas de la lista
      const matchesListaTemas = lista.temas_subtemas?.some(tema => {
        const texto = typeof tema === 'string' ? tema : obtenerTexto(tema)
        return texto.toLowerCase().includes(searchLower)
      }) || false
      
      // Buscar en correos de la lista
      const matchesListaCorreos = lista.correos?.some(correo => 
        correo.correo.toLowerCase().includes(searchLower)
      ) || false

      //Buscar en nombre de los correos
      const matchesListaCorreosNombre = lista.correos?.some(correo => 
        correo.nombre.toLowerCase().includes(searchLower)
      ) || false
      
      return matchesListaName || matchesListaTemas || matchesListaCorreos || matchesListaCorreosNombre
    }) || false
    
    return matchesBasicInfo || matchesTemasSuscritos || matchesListasDistribucion
  })

  // Funciones para manejar listas de distribución
  const addListaDistribucion = () => {
    if (formData.listas_distribucion.length >= 30) {
      setModalError('No se pueden agregar más de 30 listas de distribución.')
      return
    }
    
    if (!newLista.nombre.trim()) {
      setModalError('El nombre de la lista es obligatorio.')
      return
    }
    
    if (newLista.temas_subtemas.length === 0) {
      setModalError('Debe seleccionar al menos un tema o subtema.')
      return
    }
    
    if (newLista.correos.length === 0 || newLista.correos.every(correo => !correo.correo.trim())) {
      setModalError('Debe agregar al menos un correo electrónico válido.')
      return
    }
    
    if (newLista.correos.some(correo => correo.correo.trim() === '' || !isValidEmail(correo.correo.trim()))) {
      setModalError('Al menos uno de los correos electrónicos no es válido.')
      return
    }

    if (newLista.correos.some(correo => correo.nombre.trim() === '')) {
      setModalError('Al menos uno de los correos electrónicos no tiene un nombre.')
      return
    }
    
    // Convertir temas_subtemas de strings a objetos con id
    const temasSubtemasObjetos: TemaSubtemaGuardado[] = newLista.temas_subtemas
      .map(item => {
        // Si ya es un objeto, retornarlo directamente
        if (typeof item !== 'string') {
          return item
        }
        // Si es string, convertirlo a objeto
        const tema = temas.find(t => t.nombre_tema === item)
        if (tema) {
          return { nombre_tema: tema.nombre_tema, id_gep: tema.id_gep, id: tema.id_tema }
        }
        const subtema = subtemas.find(s => s.subtema_text === item)
        if (subtema) {
          return { subtema_text: subtema.subtema_text, id_gep: subtema.id_gep, id: subtema.id_subtema }
        }
        return null
      })
      .filter((item): item is TemaSubtemaGuardado => item !== null)
    
    // Eliminar duplicados por id único
    const temasSubtemasUnicos = temasSubtemasObjetos.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    )
    
    const listaValida: ListaDistribucion = {
      id: Date.now().toString(),
      nombre: newLista.nombre.trim(),
      temas_subtemas: temasSubtemasUnicos,
      correos: newLista.correos.filter(correo => correo.correo.trim())
    }
    
    setFormData(prev => ({
      ...prev,
      listas_distribucion: [...prev.listas_distribucion, listaValida]
    }))
    
    setNewLista({
      nombre: '',
      temas_subtemas: [],
      correos: [{nombre: '', correo: ''}]
    })
    
    setModalError(null)
    setModalSuccessMessage('Lista de distribución agregada exitosamente');
    setTimeout(() => setModalSuccessMessage(null), 3000);
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
          ? { ...lista, correos: [...lista.correos, {nombre: '', correo: ''}] }
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

  const updateCorreoInLista = (listaId: string, correoIndex: number, value: {nombre: string, correo: string}) => {
    setFormData(prev => ({
      ...prev,
      listas_distribucion: prev.listas_distribucion.map(lista => 
        lista.id === listaId 
          ? { 
              ...lista, 
              correos: lista.correos.map((correo: EmailContact | any, index) => {
                if (index === correoIndex) {
                  // Ensure we always work with clean string values
                  const cleanNombre = typeof value.nombre === 'string' ? value.nombre : (value as any).nombre?.nombre || '';
                  const cleanCorreo = typeof value.correo === 'string' ? value.correo : (value as any).correo?.correo || '';
                  
                  return {
                    nombre: cleanNombre,
                    correo: cleanCorreo
                  };
                }
                
                // Also clean existing correos to prevent nested objects
                const cleanedCorreo = {
                  nombre: typeof (correo as EmailContact).nombre === 'string' ? (correo as EmailContact).nombre : (correo as any).nombre?.nombre || '',
                  correo: typeof (correo as EmailContact).correo === 'string' ? (correo as EmailContact).correo : (correo as any).correo?.correo || ''
                };
                
                return cleanedCorreo;
              }) as EmailContact[]
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
  const addTemaSubtemaToLista = (listaId: string, temaSubtema: string | TemaSubtemaGuardado) => {
    setFormData(prev => ({
      ...prev,
      listas_distribucion: prev.listas_distribucion.map(lista => {
        if (lista.id === listaId) {
          let objeto: TemaSubtemaGuardado
          
          // Si es string, convertirlo a objeto
          if (typeof temaSubtema === 'string') {
            const tema = temas.find(t => t.nombre_tema === temaSubtema)
            if (tema) {
              objeto = { nombre_tema: tema.nombre_tema, id_gep: tema.id_gep, id: tema.id_tema }
            } else {
              const subtema = subtemas.find(s => s.subtema_text === temaSubtema)
              if (subtema) {
                objeto = { subtema_text: subtema.subtema_text, id_gep: subtema.id_gep, id: subtema.id_subtema }
              } else {
                return lista // No se encontró, retornar lista sin cambios
              }
            }
          } else {
            objeto = temaSubtema
          }
          
          // Verificar que no esté ya agregado (por id único)
          const yaExiste = lista.temas_subtemas.some(item => item.id === objeto.id)
          if (yaExiste) {
            return lista
          }
          
          return {
            ...lista,
            temas_subtemas: [...lista.temas_subtemas, objeto]
          }
        }
        return lista
      })
    }))
  }

  // Función para quitar tema/subtema de una lista existente
  const removeTemaSubtemaFromLista = (listaId: string, temaSubtema: string | TemaSubtemaGuardado | number) => {
    setFormData(prev => ({
      ...prev,
      listas_distribucion: prev.listas_distribucion.map(lista => {
        if (lista.id === listaId) {
          // Si es número, es un id directo
          if (typeof temaSubtema === 'number') {
            return {
              ...lista,
              temas_subtemas: lista.temas_subtemas.filter(item => item.id !== temaSubtema)
            }
          }
          // Si es string, buscar por nombre_tema o subtema_text
          if (typeof temaSubtema === 'string') {
            return {
              ...lista,
              temas_subtemas: lista.temas_subtemas.filter(item => 
                item.nombre_tema !== temaSubtema && item.subtema_text !== temaSubtema
              )
            }
          } else {
            // Si es objeto, filtrar por id único
            return {
              ...lista,
              temas_subtemas: lista.temas_subtemas.filter(item => item.id !== temaSubtema.id)
            }
          }
        }
        return lista
      })
    }))
  }

  // Función helper para verificar si un tema/subtema está seleccionado (usando id único)
  const estaSeleccionado = (lista: ListaDistribucion, idTema?: number, idSubtema?: number): boolean => {
    if (idTema !== undefined) {
      return lista.temas_subtemas.some(item => item.id === idTema && item.nombre_tema !== undefined)
    }
    if (idSubtema !== undefined) {
      return lista.temas_subtemas.some(item => item.id === idSubtema && item.subtema_text !== undefined)
    }
    return false
  }

  // Función helper para verificar si está seleccionado en newLista (puede tener strings o objetos)
  const estaSeleccionadoEnNuevaLista = (temasSubtemas: (string | TemaSubtemaGuardado)[], idTema?: number, idSubtema?: number): boolean => {
    if (idTema !== undefined) {
      return temasSubtemas.some(item => {
        if (typeof item === 'string') {
          return false // No podemos comparar string con id
        }
        return item.id === idTema && item.nombre_tema !== undefined
      })
    }
    if (idSubtema !== undefined) {
      return temasSubtemas.some(item => {
        if (typeof item === 'string') {
          return false // No podemos comparar string con id
        }
        return item.id === idSubtema && item.subtema_text !== undefined
      })
    }
    return false
  }

  // Función helper para obtener el texto a mostrar de un tema/subtema
  const obtenerTexto = (item: TemaSubtemaGuardado): string => {
    return item.nombre_tema || item.subtema_text || ''
  }

  // Función para subir el logo a Supabase Storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('logo').upload(fileName, file, { upsert: true });
    if (error) {
      setModalError('Error subiendo el logo.');
      return;
    }
    const { data: publicUrlData } = supabase.storage.from('logo').getPublicUrl(fileName);
    setFormData(prev => ({ ...prev, logo: publicUrlData.publicUrl }));
  };

  // Reemplazar la función de descarga por una versión con logo en Excel
  const downloadListasDistribucion = async () => {
    if (!selectedClient || !formData.listas_distribucion.length) {
      setModalError('No hay listas de distribución para descargar.');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Listas de Distribución');

      // Si hay logo, descargarlo y agregarlo
      let logoId = null;
      if (formData.logo) {
        try {
          const response = await fetch(formData.logo);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          // Detectar extensión
          let extension: 'png' | 'jpeg' | 'gif' = 'png';
          if (formData.logo.endsWith('.jpg') || formData.logo.endsWith('.jpeg')) extension = 'jpeg';
          else if (formData.logo.endsWith('.png')) extension = 'png';
          else if (blob.type === 'image/jpeg') extension = 'jpeg';
          else if (blob.type === 'image/png') extension = 'png';
          else extension = 'png'; // fallback
          // exceljs en browser requiere Uint8Array
          logoId = workbook.addImage({
            buffer: new Uint8Array(arrayBuffer) as any,
            extension,
          });
          worksheet.addImage(logoId, {
            tl: { col: 0, row: 0 },
            ext: { width: 120, height: 60 },
          });
        } catch (e) {
          console.warn('No se pudo cargar el logo o el formato no es compatible:', e);
        }
      }

      // Información del cliente
      let rowIdx = 5;
      worksheet.getCell(`A${rowIdx++}`).value = 'REPORTE DE LISTAS DE DISTRIBUCIÓN';
      worksheet.getCell(`A${rowIdx++}`).value = '=====================================';
      worksheet.getCell(`A${rowIdx++}`).value = `Cliente: ${formData.nombre_cliente}`;
      if (formData.siglas) worksheet.getCell(`A${rowIdx++}`).value = `Siglas: ${formData.siglas}`;
      worksheet.getCell(`A${rowIdx++}`).value = `Estado: ${formData.estado}`;
      worksheet.getCell(`A${rowIdx++}`).value = `Fecha de descarga: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}`;
      worksheet.getCell(`A${rowIdx++}`).value = `Total de listas: ${formData.listas_distribucion.length}`;
      rowIdx++;

      // Encabezados
      worksheet.getRow(rowIdx).values = ['LISTA DE DISTRIBUCIÓN', 'ID TEMA', 'TEMA', 'ID SUBTEMA', 'SUBTEMA', 'CORREOS ELECTRÓNICOS', 'TOTAL CORREOS'];
      worksheet.getRow(rowIdx).font = { bold: true };
      rowIdx++;

      // Datos de cada lista - crear filas distribuyendo temas y subtemas en paralelo
      formData.listas_distribucion.forEach(lista => {
        const correos = lista.correos.map(correo => correo.nombre + ' - ' + correo.correo).join('; ');
        const totalCorreos = lista.correos.length;
        
        // Separar temas y subtemas en arrays
        const temas: string[] = [];
        const temasIds: string[] = [];
        const subtemas: string[] = [];
        const subtemasIds: string[] = [];
        
        lista.temas_subtemas.forEach(item => {
          if (item.nombre_tema) {
            // Es un tema
            temas.push(item.nombre_tema);
            temasIds.push(item.id_gep ? String(item.id_gep) : '');
          } else if (item.subtema_text) {
            // Es un subtema
            subtemas.push(item.subtema_text);
            subtemasIds.push(item.id_gep ? String(item.id_gep) : '');
          }
        });
        
        // Determinar el número máximo de filas necesarias (máximo entre temas y subtemas)
        const maxFilas = Math.max(temas.length, subtemas.length);
        
        // Si no hay temas ni subtemas, crear una fila con información básica
        if (maxFilas === 0) {
          worksheet.addRow([lista.nombre, '', '', '', '', correos, totalCorreos]);
        } else {
          // Crear tantas filas como el máximo entre temas y subtemas
          for (let i = 0; i < maxFilas; i++) {
            const tema = temas[i] || '';
            const temaId = temasIds[i] || '';
            const subtema = subtemas[i] || '';
            const subtemaId = subtemasIds[i] || '';
            
            // En la primera fila, mostrar también los correos y total
            if (i === 0) {
              worksheet.addRow([
                lista.nombre,
                temaId,
                tema,
                subtemaId,
                subtema,
                correos,
                totalCorreos
              ]);
            } else {
              // En las filas siguientes, dejar vacíos correos y total
              worksheet.addRow([
                lista.nombre,
                temaId,
                tema,
                subtemaId,
                subtema,
                '',
                ''
              ]);
            }
          }
        }
      });
      // Actualizar el índice de filas según el número real de filas creadas
      rowIdx += formData.listas_distribucion.reduce((acc, lista) => {
        const temas = lista.temas_subtemas.filter(item => item.nombre_tema).length;
        const subtemas = lista.temas_subtemas.filter(item => item.subtema_text).length;
        const maxFilas = Math.max(temas, subtemas);
        return acc + (maxFilas > 0 ? maxFilas : 1);
      }, 0);

      // Resumen
      rowIdx++;
      worksheet.getCell(`A${rowIdx++}`).value = 'RESUMEN:';
      worksheet.getCell(`A${rowIdx++}`).value = `Total de listas: ${formData.listas_distribucion.length}`;
      const totalCorreos = formData.listas_distribucion.reduce((acc, lista) => acc + lista.correos.length, 0);
      worksheet.getCell(`A${rowIdx++}`).value = `Total de correos: ${totalCorreos}`;
      const totalTemas = formData.listas_distribucion.reduce((acc, lista) => acc + lista.temas_subtemas.length, 0);
      worksheet.getCell(`A${rowIdx++}`).value = `Total de temas/subtemas: ${totalTemas}`;

      // Ajustar ancho de columnas
      worksheet.columns.forEach(col => {
        col.width = 30;
      });

      // Descargar el archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const fileName = `listas_distribucion_${formData.nombre_cliente.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccessMessage(`✅ Listas de distribución descargadas correctamente: ${fileName}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error descargando listas:', error);
      setModalError('Error al descargar las listas de distribución.');
    }
  };

  // Agregar todos los temas y subtemas a la nueva lista
  const addAllTemasSubtemasToList = () => {
    const todosLosTemasYSubtemas: TemaSubtemaGuardado[] = [
      ...temas.map(tema => ({ nombre_tema: tema.nombre_tema, id_gep: tema.id_gep, id: tema.id_tema })),
      ...subtemas.map(subtema => ({ subtema_text: subtema.subtema_text, id_gep: subtema.id_gep, id: subtema.id_subtema }))
    ];
    
    setNewLista(prev => {
      // Convertir strings existentes a objetos
      const objetosExistentes: TemaSubtemaGuardado[] = prev.temas_subtemas
        .map(str => {
          if (typeof str === 'string') {
            const tema = temas.find(t => t.nombre_tema === str)
            if (tema) {
              return { nombre_tema: tema.nombre_tema, id_gep: tema.id_gep, id: tema.id_tema }
            }
            const subtema = subtemas.find(s => s.subtema_text === str)
            if (subtema) {
              return { subtema_text: subtema.subtema_text, id_gep: subtema.id_gep, id: subtema.id_subtema }
            }
          }
          return str as TemaSubtemaGuardado
        })
        .filter((item): item is TemaSubtemaGuardado => typeof item !== 'string')
      
      // Combinar y eliminar duplicados por id único
      const todosIds = new Set([
        ...objetosExistentes.map(item => item.id),
        ...todosLosTemasYSubtemas.map(item => item.id)
      ])
      
      const todosObjetos = [
        ...objetosExistentes,
        ...todosLosTemasYSubtemas
      ]
      
      const objetosUnicos = Array.from(todosIds).map(id => 
        todosObjetos.find(item => item.id === id)!
      )
      
      return {
        ...prev,
        temas_subtemas: objetosUnicos
      }
    });
  }

  useEffect(() => {
    if(showModal) {
      setBusquedaTemasPorLista({});
      setBusquedaTemaSubtema('');
    }
  }, [showModal])

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

      {/* Solo mensajes de éxito en la ventana principal */}
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
                      Temas
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
                        <div className="text-sm font-medium text-gray-900" title={`ID: ${client.id_cliente_numerico || 'N/A'}`}>
                          {client.id_cliente_numerico || 'N/A'}
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
                                    <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
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
                              {/* Limitar a 10 elementos, después, mostrar '...' */}
                              {client.temas_suscrit.slice(0, 10).map((tema, index) => {
                                // tema ya debería ser un objeto TemaSubtemaGuardado después de loadClients
                                return (
                                  <span key={index} className="inline-flex px-2 py-1 text-xs font-medium bg-gray-200 text-slate-800">
                                    {typeof tema === 'string' ? tema : obtenerTexto(tema)}
                                  </span>
                                )
                              })}
                              {client.temas_suscrit.length > 10 && (
                                <span className="text-slate-800">
                                  ... y {client.temas_suscrit.length - 10} más
                                </span>
                              )}
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
                            <Power size={16} />
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
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, clients?.length)} de {totalPages * ITEMS_PER_PAGE} documentos
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
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {modalType === 'create' && 'Nuevo Cliente'}
                {modalType === 'edit' && 'Editar Cliente'}
                {modalType === 'view' && 'Ver Detalles del Cliente'}
                {modalType === 'delete' && 'Confirmar Eliminación'}
              </h3>
              <button
                title='Cerrar'
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
                {modalError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{modalError}</p>
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
                            <button 
                              onClick={() => fileInputRef?.current?.click()} 
                              disabled={modalType === 'view'} 
                              className={clsx(
                                "px-3 h-12 w-full bg-neutral-100 border border-gray-400/50 text-gray-700 rounded-lg",
                                modalType === 'view' && 'opacity-50 cursor-not-allowed',
                                modalType !== 'view' && 'hover:bg-neutral-200 transition-colors'
                              )}
                              >
                                <div className='flex flex-col items-center'>
                                  {/* Acción a realizar */}
                                  <span className='text-sm font-semibold'>
                                    {formData.logo ? 'Cambiar Logo' : 'Subir Logo'}
                                  </span>
                                  {/* Nombre del archivo */}
                                  {formData.logo && (
                                    <span className="text-sm text-gray-500">
                                      {formData.logo.split('/').pop()}
                                    </span>
                                  )}
                                </div>
                            </button>
                            <input
                              id='logo-upload'
                              type="file"
                              accept="image/*"
                              ref={fileInputRef}
                              onChange={handleLogoUpload}
                              disabled={modalType === 'view'}
                              className="form-input w-full"
                              hidden
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Estado *
                          </label>
                          <select
                            title='Estado'
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              ID Numérico del Cliente
                            </label>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <span className="text-sm font-mono text-gray-800">{selectedClient.id_cliente_numerico || 'N/A'}</span>
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
                              {formData.temas_suscrit.map((tema, index) => {
                                return (
                                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-slate-800">
                                    {typeof tema === 'string' ? tema : obtenerTexto(tema)}
                                  </span>
                                )
                              })}
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
                          <div className="bg-[#FDE2E7] p-4 rounded-lg border border-[#BD0E40]">
                            <div className="text-2xl font-bold text-[#b30437]">
                              {formData.listas_distribucion.length}
                            </div>
                            <div className="text-sm text-[#b30437]">Listas de Distribución</div>
                          </div>

                          <div className="bg-[#FFF7E6] p-4 rounded-lg border border-[#FAC253]">
                            <div className="text-2xl font-bold text-[#fdbd3f]">
                              {formData.listas_distribucion.reduce((acc, lista) => acc + lista.correos.length, 0)}
                            </div>
                            <div className="text-sm text-[#fdbd3f]">Total de Correos</div>
                          </div>
                          
                          <div className="bg-[#FFF0E6] p-4 rounded-lg border border-[#F58220]">
                            <div className="text-2xl font-bold text-[#f58220]">
                              {(() => {
                                // Obtener todos los temas/subtemas únicos de las listas de distribución
                                const todosLosTemas = formData.listas_distribucion.flatMap(lista => lista.temas_subtemas);
                                // Eliminar duplicados
                                return [...new Set(todosLosTemas)].length;
                              })()}
                            </div>
                            <div className="text-sm text-[#f58220]">Temas y Subtemas</div>
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
                                    title='Eliminar'
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
                                            <span key={temaIndex} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-slate-800">
                                              {typeof tema === 'string' ? tema : obtenerTexto(tema)}
                                              <button
                                                title='Eliminar'
                                                type="button"
                                                onClick={() => removeTemaSubtemaFromLista(lista.id, tema)}
                                                className="ml-1 text-slate-600 hover:text-slate-800"
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
                                              const search = busquedaTemasPorLista[lista.id] || '';
                                              const temaMatch = tema.nombre_tema.toLowerCase().includes(search.toLowerCase());
                                              const subtemasTema = subtemas.filter(s => s.id_tema === tema.id_tema);
                                              const subtemaMatch = subtemasTema.some(st => st.subtema_text.toLowerCase().includes(search.toLowerCase()));
                                              return !search || temaMatch || subtemaMatch;
                                            })
                                            .map(tema => {
                                              const temaSubtemas = subtemas.filter(s => s.id_tema === tema.id_tema);
                                              // Determinar si el tema está seleccionado usando id único
                                              const temaSeleccionado = estaSeleccionado(lista, tema.id_tema);
                                              
                                              return (
                                                <div key={tema.id_tema} className="space-y-1">
                                                  {/* Tema principal */}
                                                  <div className="flex items-start gap-2 w-full">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        if (temaSeleccionado) {
                                                          removeTemaSubtemaFromLista(lista.id, tema.id_tema);
                                                        } else {
                                                          addTemaSubtemaToLista(lista.id, tema.nombre_tema);
                                                        }
                                                      }}
                                                      className={`w-4 h-4 rounded border flex-shrink-0 ${
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
                                                    <span className="font-medium text-gray-800 text-sm break-words flex-1 min-w-0">{tema.nombre_tema}</span>
                                                  </div>
                                                  
                                                  {/* Subtemas */}
                                                  {temaSubtemas.length > 0 ? (
                                                    temaSubtemas.map((st) => {
                                                      // Usar id único para verificar selección
                                                      const subtemaSeleccionado = estaSeleccionado(lista, undefined, st.id_subtema);
                                                      
                                                      return (
                                                        <div key={st.id_subtema} className="flex items-start gap-2 ml-6 w-full">
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              if (subtemaSeleccionado) {
                                                                removeTemaSubtemaFromLista(lista.id, st.id_subtema);
                                                              } else {
                                                                addTemaSubtemaToLista(lista.id, st.subtema_text);
                                                              }
                                                            }}
                                                            className={`w-4 h-4 rounded border flex-shrink-0 ${
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
                                                          <span className="text-xs bg-gray-200 text-slate-800 rounded-full px-2 py-1 break-all max-w-full">
                                                            {st.subtema_text}
                                                          </span>
                                                        </div>
                                                      );
                                                    })
                                                  ) : (
                                                    <span className="text-xs text-gray-400">No hay subtemas disponibles</span>
                                                  )}
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
                                          <span key={temaIndex} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-slate-800">
                                            {typeof tema === 'string' ? tema : obtenerTexto(tema)}
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
                                        <div key={correoIndex} className="flex items-center gap-2 bg-gray-100 p-2 rounded">
                                          <div className='flex flex-col items-center gap-2 w-full'>
                                            <input
                                              type="text"
                                              value={correo.nombre}
                                              onChange={(e) => updateCorreoInLista(lista.id, correoIndex, {nombre: e.target.value, correo: correo.correo})}
                                              disabled={modalType === 'view'}
                                              className="form-input"
                                              placeholder="Nombre del contacto"
                                            />
                                            <input
                                              type="email"
                                              value={correo.correo}
                                              onChange={(e) => updateCorreoInLista(lista.id, correoIndex, {nombre: correo.nombre, correo: e.target.value})}
                                              disabled={modalType === 'view'}
                                              className="form-input"
                                              placeholder="correo@ejemplo.com"
                                            />
                                          </div>
                                          {modalType !== 'view' && lista.correos.length > 1 && (
                                            <button
                                              title='Eliminar'
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
                                    type="text"
                                    className="form-input w-1/2"
                                    placeholder="Nombre del contacto"
                                    value={correo.nombre}
                                    onChange={e => {
                                      const value = {nombre: e.target.value, correo: correo.correo};
                                      setNewLista(prev => ({
                                        ...prev,
                                        correos: prev.correos.map((c, i) => i === idx ? value : c)
                                      }));
                                    }}
                                  />
                                  <input
                                    type="email"
                                    className="form-input w-1/2"
                                    placeholder="correo@ejemplo.com"
                                    value={correo.correo}
                                    onChange={e => {
                                      const value = {nombre: correo.nombre, correo: e.target.value};
                                      setNewLista(prev => ({
                                        ...prev,
                                        correos: prev.correos.map((c, i) => i === idx ? value : c)
                                      }));
                                    }}
                                  />
                                  {newLista.correos.length > 1 && (
                                    <button
                                      title='Eliminar'
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
                                onClick={() => setNewLista(prev => ({ ...prev, correos: [...prev.correos, {nombre: '', correo: ''}] }))}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                + Agregar correo
                              </button>
                            </div>
                          </div>
                          {/* Buscador de temas y subtemas */}
                          <div className='flex items-center justify-between gap-3 mb-3'>
                            <input
                              type="text"
                              placeholder="Buscar tema o subtema..."
                              className="form-input w-full"
                              value={busquedaTemaSubtema}
                              onChange={e => setBusquedaTemaSubtema(e.target.value)}
                            />
                            <button 
                              type='button' 
                              className='w-56 px-4 py-0 sm:py-2 h-[50px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed' 
                              onClick={addAllTemasSubtemasToList}
                              disabled={
                                new Set(newLista.temas_subtemas.map(item => {
                                  if (typeof item === 'string') {
                                    const t = temas.find(t => t.nombre_tema === item)
                                    if (t) return t.id_tema
                                    const s = subtemas.find(s => s.subtema_text === item)
                                    if (s) return s.id_subtema
                                    return -1
                                  }
                                  return item.id
                                })).size === 
                                new Set([
                                  ...temas.map(t => t.id_tema),
                                  ...subtemas.map(st => st.id_subtema)
                                ]).size
                              }
                            >
                              Agregar todos
                            </button>
                          </div>
                          {/* Listado filtrado de temas y subtemas con checkboxes */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                // Determinar si el tema está seleccionado usando id único
                                const temaSeleccionado = estaSeleccionadoEnNuevaLista(newLista.temas_subtemas, tema.id_tema);
                                return (
                                  <div key={tema.id_tema} className="border border-gray-200 rounded-lg p-3">
                                    <label className="flex items-center mb-2">
                                    <input
                                      type="checkbox"
                                      checked={temaSeleccionado}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          // Seleccionar el tema y todos sus subtemas
                                          const subtemasDelTema = temaSubtemas.map(st => ({ 
                                            subtema_text: st.subtema_text, 
                                            id_gep: st.id_gep, 
                                            id: st.id_subtema 
                                          }));
                                          const temaObjeto = { 
                                            nombre_tema: tema.nombre_tema, 
                                            id_gep: tema.id_gep, 
                                            id: tema.id_tema 
                                          };
                                          
                                          setNewLista(prev => {
                                            // Convertir strings existentes a objetos
                                            const objetosExistentes: TemaSubtemaGuardado[] = prev.temas_subtemas
                                              .map(str => {
                                                if (typeof str === 'string') {
                                                  const t = temas.find(t => t.nombre_tema === str)
                                                  if (t) return { nombre_tema: t.nombre_tema, id_gep: t.id_gep, id: t.id_tema }
                                                  const s = subtemas.find(s => s.subtema_text === str)
                                                  if (s) return { subtema_text: s.subtema_text, id_gep: s.id_gep, id: s.id_subtema }
                                                }
                                                return str as TemaSubtemaGuardado
                                              })
                                              .filter((item): item is TemaSubtemaGuardado => typeof item !== 'string')
                                            
                                            // Combinar y eliminar duplicados por id único
                                            const todosIds = new Set([
                                              ...objetosExistentes.map(item => item.id),
                                              temaObjeto.id,
                                              ...subtemasDelTema.map(item => item.id)
                                            ])
                                            
                                            const todosObjetos = [
                                              ...objetosExistentes,
                                              temaObjeto,
                                              ...subtemasDelTema
                                            ]
                                            
                                            const objetosUnicos = Array.from(todosIds).map(id => 
                                              todosObjetos.find(item => item.id === id)!
                                            )
                                            
                                            return {
                                              ...prev,
                                              temas_subtemas: objetosUnicos
                                            }
                                          });
                                        } else {
                                          // Quitar el tema y todos sus subtemas asociados usando ids únicos
                                          const idsARemover = new Set([
                                            tema.id_tema,
                                            ...temaSubtemas.map(st => st.id_subtema)
                                          ]);
                                          setNewLista(prev => ({
                                            ...prev,
                                            temas_subtemas: prev.temas_subtemas.filter(item => {
                                              if (typeof item === 'string') {
                                                // Convertir string a objeto temporalmente para verificar
                                                const t = temas.find(t => t.nombre_tema === item)
                                                if (t && idsARemover.has(t.id_tema)) return false
                                                const s = subtemas.find(s => s.subtema_text === item)
                                                if (s && idsARemover.has(s.id_subtema)) return false
                                                return true
                                              }
                                              return !idsARemover.has(item.id)
                                            })
                                          }));
                                        }
                                      }}
                                      className="mr-2"
                                    />
                                      <span className="font-medium text-gray-800 text-sm break-words flex-1 min-w-0">{tema.nombre_tema}</span>
                                    </label>
                                    <div className="flex flex-wrap gap-1 ml-5">
                                      {temaSubtemas.length > 0 ? (
                                        temaSubtemas.map(st => {
                                          // Usar id único para verificar selección
                                          const subtemaSeleccionado = estaSeleccionadoEnNuevaLista(newLista.temas_subtemas, undefined, st.id_subtema);
                                          return (
                                            <label key={st.id_subtema} className="inline-flex items-center mr-2 mb-1">
                                              <input
                                                type="checkbox"
                                                checked={subtemaSeleccionado}
                                                onChange={e => {
                                                  if (e.target.checked) {
                                                    const subtemaObjeto = { 
                                                      subtema_text: st.subtema_text, 
                                                      id_gep: st.id_gep, 
                                                      id: st.id_subtema 
                                                    };
                                                    
                                                    setNewLista(prev => {
                                                      // Convertir strings existentes a objetos
                                                      const objetosExistentes: TemaSubtemaGuardado[] = prev.temas_subtemas
                                                        .map(str => {
                                                          if (typeof str === 'string') {
                                                            const t = temas.find(t => t.nombre_tema === str)
                                                            if (t) return { nombre_tema: t.nombre_tema, id_gep: t.id_gep, id: t.id_tema }
                                                            const s = subtemas.find(s => s.subtema_text === str)
                                                            if (s) return { subtema_text: s.subtema_text, id_gep: s.id_gep, id: s.id_subtema }
                                                          }
                                                          return str as TemaSubtemaGuardado
                                                        })
                                                        .filter((item): item is TemaSubtemaGuardado => typeof item !== 'string')
                                                      
                                                      // Verificar si ya existe por id único
                                                      const yaExiste = objetosExistentes.some(item => item.id === subtemaObjeto.id)
                                                      if (yaExiste) {
                                                        return prev
                                                      }
                                                      
                                                      return {
                                                        ...prev,
                                                        temas_subtemas: [...objetosExistentes, subtemaObjeto]
                                                      }
                                                    });
                                                  } else {
                                                    // Eliminar usando id único
                                                    setNewLista(prev => ({
                                                      ...prev,
                                                      temas_subtemas: prev.temas_subtemas.filter(item => {
                                                        if (typeof item === 'string') {
                                                          // Convertir string a objeto temporalmente para verificar
                                                          const s = subtemas.find(s => s.subtema_text === item)
                                                          if (s && s.id_subtema === st.id_subtema) return false
                                                          return true
                                                        }
                                                        return item.id !== st.id_subtema
                                                      })
                                                    }));
                                                  }
                                                }}
                                                className="mr-1"
                                              />
                                              <span className="text-xs bg-gray-200 text-slate-800 rounded-full px-2 py-1 break-all max-w-full">
                                                {st.subtema_text}
                                              </span>
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
                          {modalSuccessMessage && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                              <p className="text-green-700 text-sm font-semibold">{modalSuccessMessage}</p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={addListaDistribucion}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-2"
                          >
                            Agregar Lista de Distribución
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer del modal */}
                {modalError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4 mx-6">
                    <p className="text-red-600 text-sm">{modalError}</p>
                  </div>
                )}
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
            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{modalError}</p>
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