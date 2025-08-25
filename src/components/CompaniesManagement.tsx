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
  AlertTriangle,
  Globe,
  FileText
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Company {
  id_empresa: number
  created_at?: string
  id_usuario?: number
  nombre_em: string
  rfc?: string
  giro?: string
  sitio_web?: string
}

interface CompanyFormData {
  nombre_em: string
  rfc: string
  giro: string
  sitio_web: string
}

interface CompanyStats {
  alertas_pendientes: number
  contactos_asociados: number
  proyectos_activos: number
}

const CompaniesManagement: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estados para modales
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view' | 'delete'>('create')
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  
  // Estados para formulario
  const [formData, setFormData] = useState<CompanyFormData>({
    nombre_em: '',
    rfc: '',
    giro: '',
    sitio_web: ''
  })

  // Debug
  const [showDebug, setShowDebug] = useState(false)

  // Cargar datos iniciales
  useEffect(() => {
    loadCompanies()
  }, [])

  // Cargar empresas cuando cambia el término de búsqueda
  useEffect(() => {
    loadCompanies()
  }, [searchTerm])

  const loadCompanies = async () => {
    setLoading(true)
    setError(null)
    
    try {
      let query = supabase
        .from('empresas')
        .select('*')
      
      // Aplicar búsqueda
      if (searchTerm.trim()) {
        const searchPattern = `%${searchTerm.trim().toLowerCase()}%`
        query = query.or(`nombre_em.ilike.${searchPattern},rfc.ilike.${searchPattern},giro.ilike.${searchPattern}`)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      
      console.log('✅ Empresas cargadas:', data?.length || 0, data)
      setCompanies(data || [])
    } catch (error) {
      console.error('Error cargando empresas:', error)
      setError('No se pudieron cargar las empresas.')
    } finally {
      setLoading(false)
    }
  }



  // Validar formulario
  const validateForm = (): string | null => {
    if (!formData.nombre_em.trim()) {
      return 'El nombre de la empresa es obligatorio.'
    }
    
    if (formData.rfc && formData.rfc.length > 0 && formData.rfc.length < 12) {
      return 'El RFC debe tener al menos 12 caracteres.'
    }
    
    if (formData.sitio_web && formData.sitio_web.length > 0) {
      const urlPattern = /^https?:\/\/.+/
      if (!urlPattern.test(formData.sitio_web)) {
        return 'La página web debe comenzar con http:// o https://'
      }
    }
    
    return null
  }

  // Verificar nombre duplicado
  const checkDuplicateName = async (nombre: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id_empresa')
        .ilike('nombre_em', nombre)
        .neq('id_empresa', selectedCompany?.id_empresa || 0)
      
      if (error) throw error
      return (data?.length || 0) > 0
    } catch (error) {
      console.error('Error verificando duplicados:', error)
      return false
    }
  }

  // Guardar empresa
  const saveCompany = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Verificar nombre duplicado
      const isDuplicate = await checkDuplicateName(formData.nombre_em)
      if (isDuplicate) {
        setError('Ya existe una empresa con ese nombre. Por favor utiliza un nombre distinto.')
        setLoading(false)
        return
      }
      
      if (modalType === 'create') {
        console.log('🔄 Intentando crear empresa con datos:', formData)
        
        const { data, error } = await supabase
          .from('empresas')
          .insert({
            nombre_em: formData.nombre_em.trim(),
            rfc: formData.rfc.trim() || null,
            giro: formData.giro.trim() || null,
            sitio_web: formData.sitio_web.trim() || null
          })
          .select()
        
        console.log('📊 Resultado inserción:', { data, error })
        
        if (error) {
          console.error('❌ Error detallado al crear empresa:', error)
          throw error
        }
        
        setSuccessMessage('Empresa registrada exitosamente.')
      } else if (modalType === 'edit' && selectedCompany) {
        console.log('🔄 Intentando actualizar empresa:', selectedCompany.id_empresa)
        
        const { data, error } = await supabase
          .from('empresas')
          .update({
            nombre_em: formData.nombre_em.trim(),
            rfc: formData.rfc.trim() || null,
            giro: formData.giro.trim() || null,
            sitio_web: formData.sitio_web.trim() || null
          })
          .eq('id_empresa', selectedCompany.id_empresa)
          .select()
        
        console.log('📊 Resultado actualización:', { data, error })
        
        if (error) {
          console.error('❌ Error detallado al actualizar empresa:', error)
          throw error
        }
        
        setSuccessMessage('Datos de la empresa actualizados correctamente.')
      }
      
      closeModal()
      await loadCompanies()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('❌ Error guardando empresa:', error)
      
      // Manejar errores específicos de Supabase
      if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST301') {
        setError('Error de autenticación. Verifica que tengas permisos para crear empresas.')
      } else if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        setError('Ya existe una empresa con esos datos. Verifica la información e intenta nuevamente.')
      } else if (error && typeof error === 'object' && 'message' in error) {
        setError(`Error: ${(error as { message: string }).message}`)
      } else {
        setError('Ocurrió un error al registrar la empresa. Intenta nuevamente más tarde.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Eliminar empresa
  const deleteCompany = async () => {
    if (!selectedCompany) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id_empresa', selectedCompany.id_empresa)
      
      if (error) throw error
      
      setSuccessMessage('Empresa eliminada correctamente.')
      closeModal()
      await loadCompanies()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error eliminando empresa:', error)
      setError('No se pudo eliminar la empresa. Puede tener clientes asociados.')
    } finally {
      setLoading(false)
    }
  }

  // Abrir modal
  const openModal = (type: typeof modalType, company?: Company) => {
    setModalType(type)
    setSelectedCompany(company || null)
    setError(null)
    
    if (type === 'create') {
      setFormData({
        nombre_em: '',
        rfc: '',
        giro: '',
        sitio_web: ''
      })
    } else if (company && (type === 'edit' || type === 'view')) {
      setFormData({
        nombre_em: company.nombre_em,
        rfc: company.rfc || '',
        giro: company.giro || '',
        sitio_web: company.sitio_web || ''
      })
    }
    
    setShowModal(true)
  }

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false)
    setSelectedCompany(null)
    setError(null)
  }

  // Manejar búsqueda
  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  // Debug function
  const testConnections = async () => {
    console.log('🔧 PRUEBA DE CONEXIÓN - EMPRESAS')
    
    try {
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas')
        .select('*')
        .limit(10)
      
      console.log('✅ Empresas:', { data: empresasData, error: empresasError })
    } catch (e) {
      console.error('❌ Error empresas:', e)
    }
    
    console.log('📊 Estado actual: Empresas cargadas:', companies.length)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Empresas</h1>
            <p className="text-gray-600 mt-1">Administra las empresas clientes de tu plataforma</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadCompanies}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#999996] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <button
              onClick={() => openModal('create')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Nueva Empresa
            </button>
          </div>
        </div>

        {/* Debug section */}
        <div className="mt-4">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            🔧 Debug
          </button>
          {showDebug && (
            <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={testConnections}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-xs"
                >
                  Probar Conexión
                </button>
                <button
                  onClick={loadCompanies}
                  className="px-3 py-1 bg-green-500 text-white rounded text-xs"
                >
                  Recargar Empresas
                </button>
              </div>
              <div className="text-xs text-gray-600">
                <div>🏢 Empresas: {companies.length}</div>
                <div>🔧 Abre la consola (F12) para ver detalles</div>
              </div>
            </div>
          )}
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

      {/* Búsqueda */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, RFC o giro..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="form-input pl-10 w-full"
          />
        </div>
      </div>

      {/* Grid de empresas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Cargando empresas...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">
              {searchTerm 
                ? 'No se encontraron empresas que coincidan con tu búsqueda.'
                : 'No hay empresas registradas. Registra la primera empresa para comenzar.'
              }
            </p>
          </div>
        ) : (
          companies.map((company) => (
            <CompanyCard 
              key={company.id_empresa} 
              company={company} 
              onEdit={() => openModal('edit', company)}
              onView={() => openModal('view', company)}
              onDelete={() => openModal('delete', company)}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {modalType === 'create' && 'Añadir Nueva Empresa'}
                {modalType === 'edit' && 'Editar Empresa'}
                {modalType === 'view' && 'Ver Detalles de la Empresa'}
                {modalType === 'delete' && 'Confirmar Eliminación'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="px-6 py-4">
              {modalType === 'delete' ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    ¿Estás seguro?
                  </h4>
                  <p className="text-gray-600 mb-6">
                    Esta acción eliminará permanentemente la empresa "{selectedCompany?.nombre_em}" 
                    y podría afectar los clientes asociados. Esta acción no se puede deshacer.
                  </p>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={deleteCompany}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Eliminando...' : 'Eliminar Empresa'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Formulario */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre_em}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre_em: e.target.value }))}
                      disabled={modalType === 'view'}
                      className="form-input w-full"
                      placeholder="Nombre de la empresa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RFC
                    </label>
                    <input
                      type="text"
                      value={formData.rfc}
                      onChange={(e) => setFormData(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                      disabled={modalType === 'view'}
                      className="form-input w-full"
                      placeholder="RFC de la empresa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giro
                    </label>
                    <input
                      type="text"
                      value={formData.giro}
                      onChange={(e) => setFormData(prev => ({ ...prev, giro: e.target.value }))}
                      disabled={modalType === 'view'}
                      className="form-input w-full"
                      placeholder="Giro de la empresa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Página Web
                    </label>
                    <input
                      type="url"
                      value={formData.sitio_web}
                      onChange={(e) => setFormData(prev => ({ ...prev, sitio_web: e.target.value }))}
                      disabled={modalType === 'view'}
                      className="form-input w-full"
                      placeholder="https://ejemplo.com"
                    />
                  </div>

                  {/* Información adicional para vista */}
                  {modalType === 'view' && selectedCompany && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-4">
                        Información Adicional
                      </h4>
                      <div className="grid grid-cols-1 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Fecha de registro:</span>
                          <div className="font-medium">
                            {selectedCompany.created_at 
                              ? new Date(selectedCompany.created_at).toLocaleDateString('es-MX')
                              : 'No disponible'
                            }
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">ID:</span>
                          <div className="font-medium">#{selectedCompany.id_empresa}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer del modal */}
            {modalType !== 'delete' && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {modalType === 'view' ? 'Cerrar' : 'Cancelar'}
                </button>
                {modalType !== 'view' && (
                  <button
                    onClick={saveCompany}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save size={16} />
                    {loading ? 'Guardando...' : 'Añadir Empresa'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Componente de tarjeta de empresa
interface CompanyCardProps {
  company: Company
  onEdit: () => void
  onView: () => void
  onDelete: () => void
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company, onEdit, onView, onDelete }) => {
  const [stats, setStats] = useState<CompanyStats>({
    alertas_pendientes: 0,
    contactos_asociados: 0,
    proyectos_activos: 0
  })

  useEffect(() => {
    // Simular carga de estadísticas
    const loadStats = async () => {
      setStats({
        alertas_pendientes: Math.floor(Math.random() * 50) + 10,
        contactos_asociados: Math.floor(Math.random() * 20) + 5,
        proyectos_activos: Math.floor(Math.random() * 10) + 1
      })
    }
    loadStats()
  }, [company.id_empresa])

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header de la tarjeta */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 mt-1">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg leading-tight">{company.nombre_em}</h3>
              <p className="text-sm text-gray-600 mb-1">{company.giro || 'Sin giro especificado'}</p>
              <p className="text-xs text-gray-500">{company.id_empresa}</p>
            </div>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={onView}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              title="Ver detalles"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
              title="Editar empresa"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              title="Eliminar empresa"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.alertas_pendientes}</div>
            <div className="text-xs text-gray-600">Alertas Pendientes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.contactos_asociados}</div>
            <div className="text-xs text-gray-600">Contactos Asociados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.proyectos_activos}</div>
            <div className="text-xs text-gray-600">Proyectos Activos</div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            {company.rfc && (
              <span className="flex items-center">
                <FileText size={14} className="mr-1" />
                RFC: {company.rfc}
              </span>
            )}
            {company.sitio_web && (
              <a 
                href={company.sitio_web} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <Globe size={14} className="mr-1" />
                Sitio Web
              </a>
            )}
          </div>
        </div>

        {/* Footer con botones integrados */}
        <div className="flex justify-between pt-3 border-t border-gray-100">
          <button 
            onClick={onView}
            className="text-xs px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Ver
          </button>
          <button 
            onClick={onView}
            className="text-xs px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
          >
            Contactar
          </button>
          <button 
            onClick={onEdit}
            className="text-xs px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
          >
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}

export default CompaniesManagement 