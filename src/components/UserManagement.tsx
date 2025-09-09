import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Plus, 
  Eye, 
  EyeOff,
  Edit, 
  Trash2, 
  X,
  Save,
  RefreshCw,
  AlertTriangle,
  Filter,
  Mail,
  Lock,
  User,
  Shield,
  CheckCircle,
  XCircle,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { supabase, supabaseAdmin } from '../lib/supabase'

const baseUrl = 'https://dbd.gepdigital.ai/webhook';

interface UserProfile {
  id?: number
  created_at?: string
  user_id?: string
  nombre: string
  apellido: string
  email: string
  perfil: 'Administrador' | 'Analista GEP'
  activo?: boolean
  password?: string
}

interface UserFormData {
  nombre: string
  apellido: string
  email: string
  perfil: 'Administrador' | 'Analista GEP'
  password: string
  confirmPassword: string
  activo: boolean
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'Administrador' | 'Analista GEP'>('all')
  
  // Estados para modales
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view' | 'delete' | 'toggle'>('create')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  
  // Estados para formulario
  const [formData, setFormData] = useState<UserFormData>({
    nombre: '',
    apellido: '',
    email: '',
    perfil: 'Analista GEP',
    password: '',
    confirmPassword: '',
    activo: true
  })

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)


  
  // Estados para visibilidad de contraseñas
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Cargar datos iniciales
  useEffect(() => {
    loadUsers()
  }, [])

  // Cargar usuarios cuando cambian los filtros
  useEffect(() => {
    loadUsers()
  }, [searchTerm, statusFilter, roleFilter])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Iniciando carga de usuarios...')
      
      let query = supabase
        .from('usuarios')
        .select('*')
      
      // Aplicar búsqueda
      if (searchTerm.trim()) {
        const searchPattern = `%${searchTerm.trim().toLowerCase()}%`
        query = query.or(`nombre.ilike.${searchPattern},apellido.ilike.${searchPattern},email.ilike.${searchPattern}`)
      }
      
      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('activo', statusFilter === 'active')
      }
      
      if (roleFilter !== 'all') {
        query = query.eq('perfil', roleFilter)
      }
      
      console.log('📊 Ejecutando consulta...')
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ Error detallado cargando usuarios:', error)
        throw error
      }
      
      console.log('✅ Usuarios cargados:', data?.length || 0, data)
      
      // Asegurar que activo tenga valor por defecto
      const usersWithDefaults = (data || []).map(user => ({
        ...user,
        activo: user.activo !== undefined ? user.activo : true
      }))
      
      setUsers(usersWithDefaults)
      setCurrentPage(1) // Reset página al filtrar
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      if (error instanceof Error) {
        setError(`Error cargando usuarios: ${error.message}`)
      } else {
        setError('No se pudieron cargar los usuarios.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Validaciones
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return 'El correo electrónico es obligatorio.'
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return 'Formato de correo electrónico inválido.'
    
    if (!email.endsWith('@gep.com.mx')) {
      return 'El correo debe ser del dominio @gep.com.mx.'
    }
    
    return null
  }

  const validatePassword = (password: string): string | null => {
    if (!password.trim()) return 'La contraseña es obligatoria.'
    
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.'
    }
    
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    if (!hasUppercase || !hasNumber || !hasSpecialChar) {
      return 'La contraseña no cumple con los requisitos de seguridad: mínimo 8 caracteres, al menos una mayúscula, un número y un carácter especial.'
    }
    
    return null
  }

  const validateForm = (): string | null => {
    if (!formData.nombre.trim()) return 'El nombre es obligatorio.'
    if (!formData.apellido.trim()) return 'El apellido es obligatorio.'
    
    const emailError = validateEmail(formData.email)
    if (emailError) return emailError
    
    if (modalType === 'create' || formData.password.trim()) {
      const passwordError = validatePassword(formData.password)
      if (passwordError) return passwordError
      
      if (formData.password !== formData.confirmPassword) {
        return 'Las contraseñas no coinciden.'
      }
    }
    
    return null
  }

  // Verificar duplicados
  const checkDuplicates = async (nombre: string, apellido: string, email: string): Promise<string | null> => {
    try {
      console.log('🔍 Verificando duplicados...')
      const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email')
        .neq('id', selectedUser?.id || 0)
      
      if (error) throw error
      
      for (const user of data || []) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
          return 'Ya existe un usuario registrado con ese correo.'
        }
        
        const existingNombreCompleto = `${user.nombre} ${user.apellido}`
        if (existingNombreCompleto.toLowerCase() === nombreCompleto.toLowerCase()) {
          return 'Ya existe un usuario registrado con ese nombre.'
        }
      }
      
      console.log('✅ No se encontraron duplicados')
      return null
    } catch (error) {
      console.error('Error verificando duplicados:', error)
      return null
    }
  }

  // Guardar usuario
  const saveUser = async () => {
    console.log('🚀 Iniciando proceso de guardar usuario...')
    console.log('📝 Modal type:', modalType)
    console.log('📝 Form data:', formData)
    
    const validationError = validateForm()
    if (validationError) {
      console.log('❌ Error de validación:', validationError)
      setError(validationError)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Validaciones pasadas, verificando duplicados...')
      
      // Verificar duplicados
      const duplicateError = await checkDuplicates(formData.nombre, formData.apellido, formData.email)
      if (duplicateError) {
        console.log('❌ Error de duplicado:', duplicateError)
        setError(duplicateError)
        setLoading(false)
        return
      }
      
      if (modalType === 'create') {
        console.log('🆕 Creando nuevo usuario...')
        
        try {
          // PASO 1: Crear usuario en Supabase Auth
          console.log('🔐 Paso 1: Creando usuario en Supabase Auth...')
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            email_confirm: true, // Confirmar email automáticamente
            user_metadata: {
              nombre: formData.nombre.trim(),
              apellido: formData.apellido.trim(),
              perfil: formData.perfil
            }
          })
          
          console.log('📊 Resultado creación Auth:', { authData, authError })
          
          if (authError) {
            console.error('❌ Error creando usuario en Auth:', authError)
            setError(`Error creando usuario en Auth: ${authError.message}`)
            setLoading(false)
            return
          }
          
          if (!authData.user) {
            console.error('❌ No se recibió usuario de Auth')
            setError('No se pudo crear el usuario en el sistema de autenticación')
            setLoading(false)
            return
          }
          
          console.log('✅ Usuario Auth creado con ID:', authData.user.id)
          
          // PASO 2: Crear registro en tabla usuarios
          console.log('📝 Paso 2: Creando registro en tabla usuarios...')
          const insertData = {
            user_id: authData.user.id, // Usar el ID del usuario Auth creado
            nombre: formData.nombre.trim(),
            apellido: formData.apellido.trim(),
            email: formData.email.trim().toLowerCase(),
            perfil: formData.perfil,
            activo: formData.activo
          }
          
          console.log('📊 Datos a insertar en usuarios:', insertData)
          
          const { data, error } = await supabase
            .from('usuarios')
            .insert(insertData)
            .select()
          
          console.log('📊 Resultado inserción usuarios:', { data, error })
          
          if (error) {
            console.error('❌ Error insertando en tabla usuarios:', error)
            
            // Si falla la inserción en usuarios, eliminar el usuario Auth creado
            console.log('🔄 Limpiando: eliminando usuario Auth creado...')
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
            
            setError(`Error guardando datos del usuario: ${error.message}`)
            setLoading(false)
            return
          }
          
          console.log('✅ Usuario creado exitosamente en ambas tablas')
          
        } catch (error) {
          console.error('❌ Error general en creación:', error)
          setError('Error inesperado durante la creación del usuario')
          setLoading(false)
          return
        }
        
        // Envio de correo electrónico
        try {
          const resp = await fetch(`${baseUrl}/email_nueva_cuenta`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formData.nombre.trim(),
              email: formData.email.trim(),
              link: 'ia.gep.mx/activatucuenta',
              token: formData.password,
            })
          })

          if (!resp.ok) {
            throw new Error('Error al enviar correo electrónico')
          }

          await resp.json()
          setSuccessMessage('Usuario registrado exitosamente. Se ha enviado un correo con las credenciales.')
        } catch (error) {
          console.error('❌ Error enviando correo electrónico:', error)
          setError('Error al enviar correo electrónico')
        }

      } else if (modalType === 'edit' && selectedUser) {
        console.log('✏️ Actualizando usuario:', selectedUser.id)
        
        const updateData: Record<string, unknown> = {
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          email: formData.email.trim().toLowerCase(),
          perfil: formData.perfil,
          activo: formData.activo
        }
        
        console.log('📊 Datos a actualizar:', updateData)
        
        const { data, error } = await supabase
          .from('usuarios')
          .update(updateData)
          .eq('id', selectedUser.id)
          .select()
        
        console.log('📊 Resultado actualización:', { data, error })
        
        if (error) {
          console.error('❌ Error detallado al actualizar usuario:', error)
          setError(`Error específico: ${error.message}. Código: ${error.code || 'N/A'}`)
          setLoading(false)
          return
        }
        
        console.log('✅ Usuario actualizado exitosamente')
        let message = 'Usuario actualizado correctamente.'
        
        // Si se cambió la contraseña, actualizarla en Supabase Auth
        if (formData.password.trim()) {
          console.log('🔐 Actualizando contraseña en Supabase Auth para:', formData.email)
          try {
            const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
              selectedUser.user_id || '', 
              { password: formData.password }
            )
            
            if (passwordError) {
              console.error('❌ Error actualizando contraseña:', passwordError)
              message = 'Usuario actualizado, pero hubo un error al cambiar la contraseña. Intenta nuevamente.'
            } else {
              console.log('✅ Contraseña actualizada en Auth')
              message = 'Usuario y contraseña actualizados correctamente.'
            }

            // Enviar correo electrónico al actualizar contraseña
            const resp = await fetch(`${baseUrl}/email_recuerda_cuenta`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: formData.nombre.trim(),
                email: formData.email.trim(),
                link: 'ia.gep.mx/activatucuenta',
                token: formData.password,
              })
            })

            if (!resp.ok) {
              throw new Error('Error al enviar correo electrónico')
            }
          } catch (passwordUpdateError) {
            console.error('❌ Error inesperado actualizando contraseña:', passwordUpdateError)
            message = 'Usuario actualizado, pero hubo un error al cambiar la contraseña.'
          }
        }
        
        setSuccessMessage(message)
      }
      
      console.log('🎉 Proceso completado, cerrando modal y recargando usuarios...')
      closeModal()
      await loadUsers()
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error) {
      console.error('❌ Error guardando usuario:', error)
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack available')
      
      if (error instanceof Error) {
        setError(`Error detallado: ${error.message}`)
      } else {
        setError('Ocurrió un error al procesar la solicitud. Revisa la consola para más detalles.')
      }
    } finally {
      console.log('🏁 Finalizando proceso, desactivando loading...')
      setLoading(false)
    }
  }

  // Cambiar estado del usuario
  const toggleUserStatus = async () => {
    if (!selectedUser) return
    
    setLoading(true)
    setError(null)
    
    try {
      const newStatus = !selectedUser.activo
      
      const { error } = await supabase
        .from('usuarios')
        .update({ activo: newStatus })
        .eq('id', selectedUser.id)
      
      if (error) throw error
      
      const message = newStatus 
        ? 'Usuario activado correctamente.'
        : 'Usuario desactivado correctamente.'
      
      setSuccessMessage(message)
      closeModal()
      await loadUsers()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error cambiando estado del usuario:', error)
      setError('No se pudo cambiar el estado del usuario.')
    } finally {
      setLoading(false)
    }
  }

  // Eliminar usuario
  const deleteUser = async () => {
    if (!selectedUser) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Primero eliminar de la tabla usuarios
      const { error: dbError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', selectedUser.id)
      
      if (dbError) throw dbError
      
      // Si tiene user_id, también eliminar del sistema de autenticación
      if (selectedUser.user_id) {
        console.log('🔄 Eliminando usuario del sistema de autenticación...')
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(selectedUser.user_id)
        if (authError) {
          console.warn('⚠️ Error eliminando usuario de Auth (puede que ya no exista):', authError.message)
        }
      }
      
      setSuccessMessage('Usuario eliminado correctamente.')
      closeModal()
      await loadUsers()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error eliminando usuario:', error)
      setError('No se pudo eliminar el usuario.')
    } finally {
      setLoading(false)
    }
  }

  // Abrir modal
  const openModal = (type: typeof modalType, user?: UserProfile) => {
    setModalType(type)
    setSelectedUser(user || null)
    setError(null)
    
    if (type === 'create') {
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        perfil: 'Analista GEP',
        password: '',
        confirmPassword: '',
        activo: true
      })
    } else if (user && (type === 'edit' || type === 'view')) {
      setFormData({
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        perfil: user.perfil,
        password: '',
        confirmPassword: '',
        activo: user.activo ?? true
      })
    }
    
    setShowModal(true)
  }

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false)
    setSelectedUser(null)
    setError(null)
    // Reset visibilidad de contraseñas
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  // Paginación
  const totalPages = Math.ceil(users.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedUsers = users.slice(startIndex, startIndex + itemsPerPage)

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-1">
              Administrar usuarios del sistema
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadUsers}
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
              Nuevo Usuario
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

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, apellido o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10 w-full"
              />
            </div>

            {/* Filtro por estado */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="form-input pl-10 w-full"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>

            {/* Filtro por rol */}
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                className="form-input pl-10 w-full"
              >
                <option value="all">Todos los roles</option>
                <option value="Administrador">Administrador</option>
                <option value="Analista GEP">Analista GEP</option>
              </select>
            </div>


          </div>
        </div>



        {/* Tabla de usuarios */}
        <div className="bg-white rounded-lg shadow-sm border">
          {loading && !showModal ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#999996] mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando usuarios...</p>
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                  ? 'No se encontraron usuarios que coincidan con los filtros aplicados.'
                  : 'No hay usuarios registrados. Registra el primer usuario para comenzar.'
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
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha de Registro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-[#A1A3A5] flex items-center justify-center">
                              <User className="h-5 w-5 text-[#999996]" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {user.nombre} {user.apellido}
                              </div>
                              <div className="text-sm text-gray-500">ID: {user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.perfil === 'Administrador'
                              ? 'bg-gray-100 text-stone-700'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.perfil}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                            user.activo 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.activo ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Activo</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> Inactivo</>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString('es-MX') : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openModal('view', user)}
                              className="p-2 text-[#999996] hover:bg-[#A1A3A5] rounded-lg transition-colors"
                              title="Ver detalles"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => openModal('edit', user)}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                              title="Editar usuario"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => openModal('toggle', user)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.activo 
                                  ? 'text-orange-600 hover:bg-orange-100'
                                  : 'text-green-600 hover:bg-green-100'
                              }`}
                              title={user.activo ? 'Desactivar usuario' : 'Activar usuario'}
                            >
                              {user.activo ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>
                            <button
                              onClick={() => openModal('delete', user)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Eliminar usuario"
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
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, users?.length)} de {users?.length} documentos
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
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header del modal */}
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalType === 'create' && 'Crear Nuevo Usuario'}
                  {modalType === 'edit' && 'Editar Usuario'}
                  {modalType === 'view' && 'Detalles del Usuario'}
                  {modalType === 'delete' && 'Eliminar Usuario'}
                  {modalType === 'toggle' && 'Cambiar Estado'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Contenido del modal */}
              <div className="p-6">
                {/* Mensaje de error en el modal */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="text-red-800 font-medium">Error</h4>
                        <p className="text-red-700 mt-1 text-sm">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {modalType === 'view' && selectedUser && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Completo
                      </label>
                      <p className="text-gray-900">{selectedUser.nombre} {selectedUser.apellido}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <p className="text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rol
                      </label>
                      <p className="text-gray-900">{selectedUser.perfil}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <p className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedUser.activo 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedUser.activo ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Activo</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> Inactivo</>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Registro
                      </label>
                      <p className="text-gray-900">
                        {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('es-ES') : 'N/A'}
                      </p>
                    </div>
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={closeModal}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}

                {(modalType === 'create' || modalType === 'edit') && (
                  <form onSubmit={(e) => { e.preventDefault(); saveUser(); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="text"
                            id="nombre"
                            value={formData.nombre}
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 text-stone-700 rounded-lg focus:ring-2 focus:ring-[#999996] focus:border-[#999996]"
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1">
                          Apellido *
                        </label>
                        <input
                          type="text"
                          id="apellido"
                          value={formData.apellido}
                          onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 text-stone-700 rounded-lg focus:ring-2 focus:ring-[#999996] focus:border-[#999996]"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Correo Electrónico *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 text-stone-700 rounded-lg focus:ring-2 focus:ring-[#999996] focus:border-[#999996]"
                          placeholder="usuario@gep.com.mx"
                          required
                          disabled={loading}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        El correo debe pertenecer al dominio @gep.com.mx
                      </p>
                    </div>

                    <div>
                      <label htmlFor="perfil" className="block text-sm font-medium text-gray-700 mb-1">
                        Rol *
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <select
                          id="perfil"
                          value={formData.perfil}
                          onChange={(e) => setFormData({...formData, perfil: e.target.value as UserFormData['perfil']})}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 text-stone-700 rounded-lg focus:ring-2 focus:ring-[#999996] focus:border-[#999996] appearance-none"
                          required
                          disabled={loading}
                        >
                          <option value="Analista GEP">Analista GEP</option>
                          <option value="Administrador">Administrador</option>
                        </select>
                      </div>
                    </div>

                    {(modalType === 'create' || modalType === 'edit') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña {modalType === 'create' ? '*' : '(Opcional)'}
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                              type={showPassword ? "text" : "password"}
                              id="password"
                              value={formData.password}
                              onChange={(e) => setFormData({...formData, password: e.target.value})}
                              className="w-full pl-10 pr-12 py-2 border border-gray-300 text-stone-700 rounded-lg focus:ring-2 focus:ring-[#999996] focus:border-[#999996] placeholder:text-sm"
                              placeholder="Contraseña"
                              required={modalType === 'create'}
                              disabled={loading}
                              minLength={modalType === 'create' ? 8 : undefined}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              disabled={loading}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {modalType === 'edit' && (
                            <p className="text-xs text-gray-500 mt-1">
                              Deja este campo vacío para mantener la contraseña actual
                            </p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar Contraseña {modalType === 'create' ? '*' : '(Opcional)'}
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              id="confirmPassword"
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                              className="w-full px-4 pr-12 py-2 border border-gray-300 text-stone-700 rounded-lg focus:ring-2 focus:ring-[#999996] focus:border-[#999996] placeholder:text-sm"
                              placeholder="Confirmar contraseña"
                              required={modalType === 'create'}
                              disabled={loading}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              disabled={loading}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="activo"
                        checked={formData.activo}
                        onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                        className="h-4 w-4 text-[#999996] focus:ring-[#999996] border-gray-300 rounded"
                        disabled={loading}
                      />
                      <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                        Usuario activo
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={loading}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="bg-[#D4133D] hover:bg-[#A1A3A5] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>{modalType === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {modalType === 'delete' && selectedUser && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                      <div>
                        <h4 className="font-medium">Eliminar Usuario</h4>
                        <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">
                        ¿Estás seguro de que deseas eliminar el usuario?
                      </p>
                      <p className="font-medium text-gray-900 mt-1">
                        {selectedUser.nombre} {selectedUser.apellido} ({selectedUser.email})
                      </p>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        onClick={closeModal}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={loading}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={deleteUser}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Eliminando...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            <span>Eliminar Usuario</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {modalType === 'toggle' && selectedUser && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      {selectedUser.activo ? (
                        <PowerOff className="h-6 w-6 text-red-600" />
                      ) : (
                        <Power className="h-6 w-6 text-green-600" />
                      )}
                      <div>
                        <h4 className="font-medium">
                          {selectedUser.activo ? 'Desactivar Usuario' : 'Activar Usuario'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {selectedUser.activo 
                            ? 'El usuario no podrá acceder al sistema'
                            : 'El usuario podrá acceder al sistema'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">
                        Usuario: 
                      </p>
                      <p className="font-medium text-gray-900 mt-1">
                        {selectedUser.nombre} {selectedUser.apellido} ({selectedUser.email})
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Estado actual: <span className={selectedUser.activo ? 'text-green-600' : 'text-red-600'}>
                          {selectedUser.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </p>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        onClick={closeModal}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={loading}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={toggleUserStatus}
                        className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 ${
                          selectedUser.activo
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Procesando...</span>
                          </>
                        ) : (
                          <>
                            {selectedUser.activo ? (
                              <><PowerOff className="h-4 w-4" /><span>Desactivar</span></>
                            ) : (
                              <><Power className="h-4 w-4" /><span>Activar</span></>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </>
  )
}

export default UserManagement