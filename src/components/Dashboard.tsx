import React, { useState, useEffect } from 'react'
import { useAuth, moduleLabels } from '../contexts/AuthContext'
import DocumentManagement from './DocumentManagement'
import ThemeManagement from './ThemeManagement'
import ClientsManagement from './ClientsManagement'
import CompaniesManagement from './CompaniesManagement'
import UserManagement from './UserManagement'
import AlertsManagement from './AlertsManagement'
import { supabase } from '../lib/supabase'
import logoNegro from '../assets/images/logonegro.jpg'
import { 
  BarChart3, 
  Users, 
  Settings, 
  LogOut,
  TrendingUp,
  FileText,
  AlertTriangle,
  RefreshCw,
  Menu,
  X,
  Calendar,
  UserCog,
  Bot,
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle,
  Loader2,
  Building,
  Gavel,
  Newspaper,
  Tag,
  Download
} from 'lucide-react'
import ExcelJS from 'exceljs';

interface KPIData {
  documentsToday: number
  alertsSent: {
    general: number
    diputados: number
    senado: number
    dof: number
  }
  pendingAlerts: {
    general: number
    diputados: number
    senado: number
    dof: number
  }
}



interface ChartData {
  source: string
  documents: number
}

interface Document {
  id_senado_doc: number
  created_at: string
  sinopsis: string
  iniciativa_texto: string
  iniciativa_id: string
  gaceta: string
  link_iniciativa: string
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
}

interface BotConfig {
  id: string
  name: string
  description: string
  webhookUrl: string
  icon: React.ReactNode
  color: string
}

interface BotExecutionHistory {
  id: number;
  fuente: string;
  fecha: string;
  tipo: string;
  ejecutado_por: string | null;
  estatus: string;
  detalles: any;
}

// Componente BotsExecution inline
const BotsExecution: React.FC = () => {
  const { user } = useAuth();
  const [executingBot, setExecutingBot] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [history, setHistory] = useState<BotExecutionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    fuente: 'todas',
    tipo: 'todos',
    estatus: 'todos',
    desde: '',
    hasta: ''
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Cargar historial de ejecuciones desde Supabase
  const loadBotExecutions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bot_executions')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1000); // Limitar a 1000 registros más recientes

      if (error) {
        console.error('Error loading bot executions:', error);
      } else {
        setHistory(data || []);
      }
    } catch (error) {
      console.error('Error loading bot executions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBotExecutions();
  }, []);

  // Limpieza automática si supera 1200 registros
  useEffect(() => {
    if (history.length > 1200) {
      setHistory(history.slice(0, 1200));
    }
  }, [history]);

  // Filtros
  const filtered = history.filter(row => {
    const f = filters;
    let ok = true;
    if (f.fuente !== 'todas' && row.fuente !== f.fuente) ok = false;
    if (f.tipo !== 'todos' && row.tipo !== f.tipo) ok = false;
    if (f.estatus !== 'todos' && row.estatus !== f.estatus) ok = false;
    if (f.desde && new Date(row.fecha) < new Date(f.desde)) ok = false;
    if (f.hasta && new Date(row.fecha) > new Date(f.hasta)) ok = false;
    return ok;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const bots: BotConfig[] = [
    {
      id: 'diputados',
      name: 'Cámara de Diputados',
      description: 'Extracción de documentos de Cámara de Diputados',
      webhookUrl: 'https://dbd.gepdigital.ai/webhook/diputados',
      icon: <Building className="w-6 h-6" />,
      color: 'bg-[#B52244] hover:bg-[#D4133D]'
    },
    {
      id: 'senado',
      name: 'Cámara de Senadores',
      description: 'Extracción de documentos de Cámara de Senadores',
      webhookUrl: 'https://dbd.gepdigital.ai/webhook/senadores',
      icon: <Gavel className="w-6 h-6" />,
      color: 'bg-[#999996] hover:bg-[#A1A3A5]'
    },
    {
      id: 'dof',
      name: 'Diario Oficial de la Federación',
      description: 'Extracción de documentos del DOF',
      webhookUrl: 'https://dbd.gepdigital.ai/webhook/dofv2',
      icon: <Newspaper className="w-6 h-6" />,
      color: 'bg-[#B52244] hover:bg-[#D4133D]'
    }
  ]

  const executeBot = async (bot: BotConfig) => {
    setExecutingBot(bot.id)
    setError(null)
    setSuccessMessage(null)

    const payload = {
      trigger: 'manual',
      timestamp: new Date().toISOString(),
      source: 'dashboard',
      user_email: user?.email || null
    }

    // Registrar inicio de ejecución en la base de datos
    const executionStart = {
      fuente: bot.name,
      tipo: 'Manual',
      ejecutado_por: user?.email || null,
      estatus: 'en proceso',
      detalles: { payload, initiated_at: new Date().toISOString() }
    }

    let executionId: number | null = null

    try {
      // Insertar registro de ejecución
      const { data: insertData, error: insertError } = await supabase
        .from('bot_executions')
        .insert(executionStart)
        .select('id')
        .single()

      if (insertError) {
        console.error('Error insertando ejecución:', insertError)
      } else {
        executionId = insertData?.id
      }

      console.log(`🤖 Ejecutando bot ${bot.name}...`)
      console.log(`🔗 URL: ${bot.webhookUrl}`)

      // 1) Intento estándar con JSON (si el servidor tiene CORS correcto, funcionará)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      let response: Response | null = null
      try {
        response = await fetch(`${bot.webhookUrl}?ts=${Date.now()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal
        })
        clearTimeout(timeoutId)
      } catch (primaryError) {
        clearTimeout(timeoutId)
        console.warn('⚠️ Falló la llamada estándar (posible CORS). Aplicando fallback no-cors...', primaryError)

        // 2) Fallback sin CORS ni headers (evita preflight). La respuesta será opaca, pero el servidor recibirá el trigger.
        await fetch(`${bot.webhookUrl}?ts=${Date.now()}`, {
          method: 'POST',
          mode: 'no-cors',
          keepalive: true,
          body: JSON.stringify(payload)
        })

        // Actualizar estado a éxito (fallback)
        if (executionId) {
          await supabase
            .from('bot_executions')
            .update({ 
              estatus: 'éxito', 
              detalles: { 
                ...executionStart.detalles, 
                completed_at: new Date().toISOString(),
                method: 'no-cors fallback'
              }
            })
            .eq('id', executionId)
        }

        setSuccessMessage(`✅ Bot ${bot.name} ejecutado. En 30 minutos los datos estarán actualizados.`)
        loadBotExecutions() // Recargar lista
        return
      }

      if (response && response.ok) {
        // Actualizar estado a éxito
        if (executionId) {
          await supabase
            .from('bot_executions')
            .update({ 
              estatus: 'éxito', 
              detalles: { 
                ...executionStart.detalles, 
                completed_at: new Date().toISOString(),
                response_status: response.status
              }
            })
            .eq('id', executionId)
        }
        
        setSuccessMessage(`✅ Bot ${bot.name} ejecutado exitosamente. En 30 minutos los datos estarán actualizados.`)
        console.log(`✅ Bot ${bot.name} ejecutado correctamente`)
      } else {
        console.warn('⚠️ Respuesta no exitosa. Aplicando fallback no-cors...')
        await fetch(`${bot.webhookUrl}?ts=${Date.now()}`, {
          method: 'POST',
          mode: 'no-cors',
          keepalive: true,
          body: JSON.stringify(payload)
        })

        // Actualizar estado a éxito (fallback)
        if (executionId) {
          await supabase
            .from('bot_executions')
            .update({ 
              estatus: 'éxito', 
              detalles: { 
                ...executionStart.detalles, 
                completed_at: new Date().toISOString(),
                method: 'no-cors fallback response'
              }
            })
            .eq('id', executionId)
        }

        setSuccessMessage(`✅ Bot ${bot.name} ejecutado. En 30 minutos los datos estarán actualizados.`)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error(`❌ Error ejecutando bot ${bot.name}:`, error)
      
      // Actualizar estado a falla
      if (executionId) {
        await supabase
          .from('bot_executions')
          .update({ 
            estatus: 'falla', 
            detalles: { 
              ...executionStart.detalles, 
              completed_at: new Date().toISOString(),
              error: errorMessage
            }
          })
          .eq('id', executionId)
      }
      
      setError(`Error ejecutando el bot ${bot.name}: ${errorMessage}`)
    } finally {
      setExecutingBot(null)
      loadBotExecutions() // Recargar lista en todos los casos
    }
  }

  const clearMessages = () => {
    setSuccessMessage(null)
    setError(null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Bot className="text-[#1F2937]" size={32} />
          <div>
            <h2 className="text-2xl font-bold text-[#1F2937]">Ejecución de Bots AI</h2>
            <p className="text-[#1F2937]">Ejecuta los bots de extracción de documentos</p>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-green-800 font-medium">¡Éxito!</p>
              <p className="text-green-700 text-sm mt-1">{successMessage}</p>
            </div>
          </div>
          <button
            onClick={clearMessages}
            className="text-green-600 hover:text-green-700 text-sm font-medium ml-4"
          >
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={clearMessages}
            className="text-red-600 hover:text-red-700 text-sm font-medium ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Bots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {bots.map((bot) => (
          <div key={bot.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col h-full">
              {/* Icon y título */}
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-3 rounded-full ${bot.color.split(' ')[0].replace('bg-', 'bg-').replace('500', '100')} text-white`}>
                  {bot.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#1F2937] text-sm leading-tight">
                    {bot.name}
                  </h3>
                </div>
              </div>
              {/* Descripción */}
              <div className="flex-1 mb-4">
                <p className="text-[#1F2937] text-sm leading-relaxed">
                  {bot.description}
                </p>
              </div>
              {/* Botón de ejecución */}
              <button
                onClick={() => executeBot(bot)}
                disabled={executingBot !== null}
                className={`
                  w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg
                  text-white font-medium transition-colors text-sm
                  ${executingBot === bot.id 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : executingBot !== null 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : bot.color
                  }
                `}
              >
                {executingBot === bot.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Ejecutando...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Ejecutar Bot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

                           {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-[#1F2937] mb-1">Fuente</label>
            <select className="border rounded px-2 py-1 text-[#1F2937]" value={filters.fuente} onChange={e => setFilters(f => ({ ...f, fuente: e.target.value }))}>
              <option value="todas">Todas</option>
              <option value="Cámara de Diputados">Cámara de Diputados</option>
              <option value="Senado">Senado</option>
              <option value="DOF">DOF</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1F2937] mb-1">Tipo</label>
            <select className="border rounded px-2 py-1 text-[#1F2937]" value={filters.tipo} onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))}>
              <option value="todos">Todos</option>
              <option value="Manual">Manual</option>
              <option value="Automática">Automática</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1F2937] mb-1">Estatus</label>
            <select className="border rounded px-2 py-1 text-[#1F2937]" value={filters.estatus} onChange={e => setFilters(f => ({ ...f, estatus: e.target.value }))}>
              <option value="todos">Todos</option>
              <option value="éxito">Éxito</option>
              <option value="falla">Falla</option>
              <option value="en proceso">En proceso</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1F2937] mb-1">Desde</label>
            <input type="date" className="border rounded px-2 py-1 text-[#1F2937]" value={filters.desde} onChange={e => setFilters(f => ({ ...f, desde: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1F2937] mb-1">Hasta</label>
            <input type="date" className="border rounded px-2 py-1 text-[#1F2937]" value={filters.hasta} onChange={e => setFilters(f => ({ ...f, hasta: e.target.value }))} />
          </div>
        </div>

      {/* Tabla de historial */}
      <div className="bg-white rounded-lg shadow-sm border p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-[#1F2937]">ID</th>
              <th className="px-3 py-2 text-left text-[#1F2937]">Fuente</th>
              <th className="px-3 py-2 text-left text-[#1F2937]">Fecha y hora</th>
              <th className="px-3 py-2 text-left text-[#1F2937]">Tipo</th>
              <th className="px-3 py-2 text-left text-[#1F2937]">Ejecutado por</th>
              <th className="px-3 py-2 text-left text-[#1F2937]">Estatus</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-[#1F2937]" />
                    <span className="text-[#1F2937]">Cargando historial de ejecuciones...</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map(row => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-[#1F2937]">{row.id}</td>
                  <td className="px-3 py-2 text-[#1F2937]">{row.fuente}</td>
                  <td className="px-3 py-2 text-[#1F2937]">{new Date(row.fecha).toLocaleString('es-MX')}</td>
                  <td className="px-3 py-2 text-[#1F2937]">{row.tipo}</td>
                  <td className="px-3 py-2 text-[#1F2937]">{row.tipo === 'Manual' ? (row.ejecutado_por || '-') : '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      row.estatus === 'éxito' ? 'bg-green-100 text-green-700' :
                      row.estatus === 'falla' ? 'bg-red-100 text-red-700' :
                      row.estatus === 'en proceso' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {row.estatus.charAt(0).toUpperCase() + row.estatus.slice(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
            {!loading && paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[#1F2937] py-6">Sin registros</td>
              </tr>
            )}
          </tbody>
        </table>
                                   {/* Paginación */}
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-[#1F2937]">Página {page} de {totalPages || 1}</span>
            <div className="space-x-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border rounded text-xs disabled:opacity-50 text-[#1F2937] border-[#1F2937]">Anterior</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="px-2 py-1 border rounded text-xs disabled:opacity-50 text-[#1F2937] border-[#1F2937]">Siguiente</button>
            </div>
          </div>
      </div>

      {/* Información adicional */}
              <div className="bg-[#A1A3A5]/20 border border-[#A1A3A5] rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Bot className="text-[#1F2937] flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-[#1F2937] font-medium">Información importante</p>
            <ul className="text-[#1F2937] text-sm mt-2 space-y-1">
              <li>• Los bots se ejecutan de forma asíncrona en segundo plano</li>
              <li>• Los datos actualizados estarán disponibles en aproximadamente 30 minutos</li>
              <li>• Solo los administradores pueden ejecutar los bots</li>
              <li>• Los resultados se reflejarán en el dashboard y módulos correspondientes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

const Dashboard: React.FC = () => {
  const { user, userRole, signOut, hasAccess, allowedModules } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [kpiData, setKpiData] = useState<KPIData>({
    documentsToday: 0,
    alertsSent: {
      general: 0,
      diputados: 0,
      senado: 0,
      dof: 0
    },
    pendingAlerts: {
      general: 0,
      diputados: 0,
      senado: 0,
      dof: 0
    }
  })
  const [chartData, setChartData] = useState<ChartData[]>([
    { source: 'Cámara de Diputados', documents: 0 },
    { source: 'Cámara de Senadores', documents: 0 },
    { source: 'Diario Oficial de la Federación', documents: 0 }
  ])
  const [documentsToday, setDocumentsToday] = useState<Document[]>([])
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  // Definir íconos para cada módulo
  const moduleIcons: Record<string, React.ReactNode> = {
    'dashboard': <BarChart3 size={20} />,
    'documents': <FileText size={20} />,
    'alerts': <AlertTriangle size={20} />,
    'clients': <Users size={20} />,
    'themes': <Settings size={20} />,
    'users': <UserCog size={20} />,
    'bots': <Bot size={20} />
  }

  // Función para obtener el título de la página
  const getPageTitle = () => {
    if (activeSection === 'dashboard') return 'Dashboard'
    return moduleLabels[activeSection] || 'Módulo'
  }

  // Protección de acceso: verificar si el usuario puede acceder al módulo activo
  useEffect(() => {
    if (activeSection !== 'dashboard' && !hasAccess(activeSection)) {
      // Si el usuario no tiene acceso al módulo actual, redirigir a dashboard
      setActiveSection('dashboard')
      setError('No tienes permisos para acceder a este módulo.')
      setTimeout(() => setError(null), 5000)
    }
  }, [activeSection, hasAccess])

  // Actualizar título del documento basado en la sección activa
  useEffect(() => {
    const baseTitle = 'GEP - Sistema de Gestión Empresarial'
    const sectionTitle = getPageTitle()
    
    if (sectionTitle === 'Dashboard') {
      document.title = baseTitle
    } else {
      document.title = `${sectionTitle} | ${baseTitle}`
    }
    
    // Cleanup: restaurar título original al desmontar
    return () => {
      document.title = baseTitle
    }
  }, [activeSection])

  // Responsive: colapsar sidebar automáticamente en pantallas pequeñas
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true)
        setMobileMenuOpen(false)
      }
    }

    handleResize() // Ejecutar al montar
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Actualizar fecha cada minuto
  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(new Date())
    }

    // Actualizar inmediatamente
    updateDate()

    // Actualizar cada minuto
    const interval = setInterval(updateDate, 60000)

    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('📊 Cargando datos del dashboard del día actual...')
      
      // Calcular fecha del día actual
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      
      // 1. Documentos capturados durante el día (desde tabla senado)
      const { count: documentsTodayCount, error: docsTodayError } = await supabase
        .from('senado')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStr)
        .lt('created_at', todayStr + 'T23:59:59.999Z')
      
      if (docsTodayError) {
        console.error('Error obteniendo documentos del día:', docsTodayError)
      }
      
      // 2. Obtener TODOS los documentos del día actual (sin paginación)
      const { data: allDocumentsToday, error: allDocsError } = await supabase
        .from('senado')
        .select('*')
        .gte('created_at', todayStr)
        .lt('created_at', todayStr + 'T23:59:59.999Z')
        .order('created_at', { ascending: false })
      
      if (allDocsError) {
        console.error('Error obteniendo todos los documentos del día:', allDocsError)
      } else {
        setDocumentsToday(allDocumentsToday || [])
        console.log('📄 Documentos del día cargados:', (allDocumentsToday || []).length)
      }
      
      // 3. Documentos por fuente del día actual para el gráfico
      const { data: documentsTodayBySource, error: docsTodayError2 } = await supabase
        .from('senado')
        .select('fuente')
        .gte('created_at', todayStr)
        .lt('created_at', todayStr + 'T23:59:59.999Z')
      
      if (docsTodayError2) {
        console.error('Error obteniendo documentos por fuente del día:', docsTodayError2)
      }
      
      // Función para normalizar el nombre de la fuente
      const normalizarFuente = (fuente: string): string => {
        const fuenteLower = fuente.toLowerCase().trim()
        
        if (fuenteLower.includes('diputados') || fuenteLower.includes('diputado')) {
          return 'diputados'
        }
        if (fuenteLower.includes('senado') || fuenteLower.includes('senador')) {
          return 'senado'
        }
        if (fuenteLower.includes('dof') || fuenteLower.includes('diario oficial')) {
          return 'dof'
        }

        
        return fuenteLower
      }
      
      // Procesar datos por fuente del día actual
      const fuenteCount: Record<string, number> = {}
      documentsTodayBySource?.forEach(doc => {
        const fuente = doc.fuente || 'sin_fuente'
        const fuenteNormalizada = normalizarFuente(fuente)
        fuenteCount[fuenteNormalizada] = (fuenteCount[fuenteNormalizada] || 0) + 1
      })
      
      console.log('📊 Documentos por fuente (día actual):', fuenteCount)
      console.log('📊 Total de documentos procesados:', documentsTodayBySource?.length || 0)
      console.log('📊 Valores únicos de fuente encontrados:', [...new Set(documentsTodayBySource?.map(d => d.fuente) || [])])
      console.log('📊 Valores únicos de fuente normalizados:', [...new Set(documentsTodayBySource?.map(d => normalizarFuente(d.fuente || '')) || [])])
      
      // 4. Alertas enviadas hoy (desde alertas_log con status_alerta = 1)
      const { data: alertasEnviadasHoy, error: alertasEnviadasError } = await supabase
        .from('alertas_log')
        .select('id_alerta, created_at')
        .eq('status_alerta', 1)
        .gte('created_at', todayStr)
        .lt('created_at', todayStr + 'T23:59:59.999Z')
      
      if (alertasEnviadasError) {
        console.error('Error obteniendo alertas enviadas del día:', alertasEnviadasError)
      }
      
      // 5. Alertas pendientes hoy (desde alertas_log con status_alerta = 0)
      const { data: alertasPendientesHoy, error: alertasPendientesError } = await supabase
        .from('alertas_log')
        .select('id_alerta, created_at')
        .eq('status_alerta', 0)
        .gte('created_at', todayStr)
        .lt('created_at', todayStr + 'T23:59:59.999Z')
      
      if (alertasPendientesError) {
        console.error('Error obteniendo alertas pendientes del día:', alertasPendientesError)
      }
      
      // 6. Obtener detalles de alertas para mapear por fuente
      const alertasIds = [
        ...(alertasEnviadasHoy || []).map(a => a.id_alerta),
        ...(alertasPendientesHoy || []).map(a => a.id_alerta)
      ]
      
      let alertasDetalles: Array<{id_alerta: number, temas: string | string[]}> = []
      if (alertasIds.length > 0) {
        const { data: alertasDetallesData, error: alertasDetallesError } = await supabase
          .from('alertas_directorio')
          .select('id_alerta, temas')
          .in('id_alerta', alertasIds)
        
        if (alertasDetallesError) {
          console.error('Error obteniendo detalles de alertas:', alertasDetallesError)
        } else {
          alertasDetalles = alertasDetallesData || []
        }
      }
      
      // Mapear alertas por fuente basándose en los temas
      const mapearFuentePorTemas = (temas: string[] | string): string => {
        const temasArray = Array.isArray(temas) ? temas : [temas]
        const temasStr = temasArray.join(' ').toLowerCase()
        
        if (temasStr.includes('diputados') || temasStr.includes('cámara de diputados')) return 'diputados'
        if (temasStr.includes('senado') || temasStr.includes('senadores')) return 'senado'
        if (temasStr.includes('dof') || temasStr.includes('diario oficial')) return 'dof'

        return 'general'
      }
      
      // Contar alertas enviadas por fuente
      const alertasEnviadasPorFuente: Record<string, number> = {
        general: 0,
        diputados: 0,
        senado: 0,
        dof: 0
      }
      
      alertasEnviadasHoy?.forEach(alerta => {
        const detalle = alertasDetalles.find(d => d.id_alerta === alerta.id_alerta)
        const fuente = mapearFuentePorTemas(detalle?.temas || [])
        alertasEnviadasPorFuente[fuente]++
      })
      
      // Contar alertas pendientes por fuente
      const alertasPendientesPorFuente: Record<string, number> = {
        general: 0,
        diputados: 0,
        senado: 0,
        dof: 0
      }
      
      alertasPendientesHoy?.forEach(alerta => {
        const detalle = alertasDetalles.find(d => d.id_alerta === alerta.id_alerta)
        const fuente = mapearFuentePorTemas(detalle?.temas || [])
        alertasPendientesPorFuente[fuente]++
      })
      
      // Crear KPIs según nuevas especificaciones
      const realKpiData: KPIData = {
        documentsToday: documentsTodayCount || 0,
        alertsSent: {
          general: alertasEnviadasPorFuente.general,
          diputados: alertasEnviadasPorFuente.diputados,
          senado: alertasEnviadasPorFuente.senado,
          dof: alertasEnviadasPorFuente.dof
        },
        pendingAlerts: {
          general: alertasPendientesPorFuente.general,
          diputados: alertasPendientesPorFuente.diputados,
          senado: alertasPendientesPorFuente.senado,
          dof: alertasPendientesPorFuente.dof
        }
      }
      
      // Crear datos del gráfico del día actual
      const realChartData: ChartData[] = [
        { 
          source: 'Cámara de Diputados', 
          documents: fuenteCount['diputados'] || 0
        },
        { 
          source: 'Cámara de Senadores', 
          documents: fuenteCount['senado'] || 0
        },
        { 
          source: 'Diario Oficial de la Federación', 
          documents: fuenteCount['dof'] || 0
        }
      ]
      
      console.log('✅ KPIs calculados:', realKpiData)
      console.log('✅ Datos del gráfico:', realChartData)
      console.log('✅ Total de documentos en KPIs:', realKpiData.documentsToday)
      console.log('✅ Total de documentos en gráficos:', realChartData.reduce((sum, item) => sum + item.documents, 0))
      
      setKpiData(realKpiData)
      setChartData(realChartData)
      
      // Mostrar mensaje si no hay datos
      if (realKpiData.documentsToday === 0 && realChartData.every(item => item.documents === 0)) {
        console.log('ℹ️ No hay datos disponibles para mostrar hoy')
      } else {
        console.log('✅ Datos disponibles para mostrar en gráficos')
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error)
      setError('No se pudieron cargar los datos del dashboard. Reintenta en unos minutos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeSection === 'dashboard') {
      loadDashboardData()
      
      // Auto-refresh cada 10 minutos
      const interval = setInterval(loadDashboardData, 10 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [activeSection])

  const handleSectionChange = (section: string) => {
    // Verificar acceso antes de cambiar de sección
    if (section !== 'dashboard' && !hasAccess(section)) {
      setError('No tienes permisos para acceder a este módulo.')
      setTimeout(() => setError(null), 5000)
      return
    }
    
    setActiveSection(section)
    setError(null)
  }

  const handleKpiClick = (type: 'documents' | 'alerts') => {
    try {
      if (!hasAccess(type)) {
        setError('No tienes permisos para acceder a este módulo.')
        setTimeout(() => setError(null), 5000)
        return
      }
      
      setActiveSection(type)
    } catch (error) {
      console.error('Error al redirigir al módulo:', error)
      setError('No se pudo redirigir al módulo solicitado. Intenta nuevamente más tarde.')
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = async () => {
    try {
      setLogoutLoading(true)
      setError(null)
      
      // Timeout de seguridad de 10 segundos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: El proceso tardó demasiado')), 10000)
      )
      
      await Promise.race([signOut(), timeoutPromise])
      
      setShowLogoutModal(false)
      // El redirect al login se maneja automáticamente por el AuthContext
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      setError(error instanceof Error ? error.message : 'Error al cerrar sesión. Intenta nuevamente.')
      setTimeout(() => setError(null), 5000)
    } finally {
      setLogoutLoading(false)
    }
  }

  const cancelLogout = () => {
    setShowLogoutModal(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number = 60) => {
    if (!text) return 'Sin información'
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  }

  const exportToExcel = async () => {
    if (documentsToday.length === 0) {
      alert('No hay documentos para exportar.')
      return
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Documentos del Día');
    // Encabezados con todos los campos de la interfaz Document
    const headers = [
      'ID',
      'Fecha de creación',
      'Sinopsis',
      'Título',
      'ID Iniciativa',
      'Gaceta',
      'Link Iniciativa',
      'Fuente',
      'Imagen Link',
      'Temas',
      'Personas',
      'Partidos',
      'Leyes',
      'Resumen',
      'Análisis',
      'Objeto',
      'Proponente',
      'Tipo',
      'Correspondiente',
    ];
    worksheet.addRow(headers);
    documentsToday.forEach(doc => {
      worksheet.addRow([
        doc.id_senado_doc,
        doc.created_at,
        doc.sinopsis,
        doc.iniciativa_texto,
        doc.iniciativa_id,
        doc.gaceta,
        doc.link_iniciativa,
        doc.fuente,
        doc.imagen_link,
        doc.temas,
        doc.personas,
        doc.partidos,
        doc.leyes,
        doc.resumen,
        doc.analisis,
        doc.objeto,
        doc.correspondier,
        doc.tipo,
        // Correspondiente puede ser null, pero lo incluimos para mantener el orden
      ]);
    });
    worksheet.columns.forEach(col => { col.width = 25; });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `documentos_del_dia_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'documents':
        return <DocumentManagement />
      case 'alerts':
        return <AlertsManagement />
      case 'clients':
        return <ClientsManagement />
      case 'companies':
        return <CompaniesManagement />
      case 'themes':
        return <ThemeManagement />
      case 'users':
        return <UserManagement />
      case 'bots':
        return <BotsExecution />
      default:
        return (
          <div className="p-4 md:p-6 space-y-6">
            {/* Header del Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-600 mt-1 text-sm md:text-base">
                  Bienvenido, {user?.email} ({userRole})
                </p>
              </div>
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-[#999996] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Actualizar</span>
                <span className="sm:hidden">↻</span>
              </button>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6 mb-6 md:mb-8">
              {/* Documentos capturados hoy */}
              <button
                type="button"
                className="metric-card hover:shadow-md transition-shadow"
                onClick={() => handleKpiClick('documents')}
              >
                <div className="min-w-0" title='Documentos capturados hoy'>
                  <p className="text-sm font-medium text-gray-600 truncate text-left">Documentos capturados hoy</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{kpiData.documentsToday}</p>
                  <div className="p-3 bg-[#A1A3A5]/30 rounded-full flex-shrink-0">
                    <FileText className="text-[#999996]" size={20} />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <TrendingUp className="text-black mr-1 flex-shrink-0" size={14} />
                  <span className="text-xs md:text-sm text-black truncate">Capturados el día de hoy</span>
                </div>
              </button>


              {/* Alertas pendientes - General */}
              <button
                type="button"
                className="metric-card hover:shadow-md transition-shadow"
                onClick={() => handleKpiClick('alerts')}
              >
                <div className="min-w-0 flex-1" title='Alertas pendientes hoy'>
                  <p className="text-sm font-medium text-gray-600 truncate text-left">Alertas pendientes hoy</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{kpiData.pendingAlerts.general}</p>
                  <div className="p-3 bg-[#D4133D]/25 rounded-full flex-shrink-0">
                    <AlertTriangle className="text-[#B52244]" size={20} />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <Calendar className="text-black mr-1 flex-shrink-0" size={14} />
                  <span className="text-xs md:text-sm text-black truncate">Requieren atención</span>
                </div>
              </button>

              {/* Alertas pendientes - Diputados */}
              <button
                type="button" 
                className="metric-card hover:shadow-md transition-shadow"
                onClick={() => handleKpiClick('alerts')}
              >
                <div className="min-w-0 flex-1" title='Alertas pendientes - Diputados'>
                  <p className="text-sm font-medium text-gray-600 truncate text-left">Alertas pendientes - Diputados</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{kpiData.pendingAlerts.diputados}</p>
                  <div className="p-3 bg-[#A1A3A5]/25 rounded-full flex-shrink-0">
                    <Building className="text-[#999996]" size={20} />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <Calendar className="text-black mr-1 flex-shrink-0" size={14} />
                  <span className="text-xs md:text-sm text-black truncate">Requieren atención</span>
                </div>
              </button>

              {/* Alertas pendientes - Senado */}
              <button
                type="button"
                className="metric-card hover:shadow-md transition-shadow"
                onClick={() => handleKpiClick('alerts')}
              >
                <div className="min-w-0 flex-1" title='Alertas pendientes - Senado'>
                  <p className="text-sm font-medium text-gray-600 truncate text-left">Alertas pendientes - Senado</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{kpiData.pendingAlerts.senado}</p>
                  <div className="p-3 bg-[#D4133D]/25 rounded-full flex-shrink-0">
                    <Gavel className="text-[#B52244]" size={20} />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <Calendar className="text-black mr-1 flex-shrink-0" size={14} />
                  <span className="text-xs md:text-sm text-black truncate">Requieren atención</span>
                </div>
              </button>

              {/* Alertas pendientes - DOF */}
              <button
                type="button"
                className="metric-card hover:shadow-md transition-shadow"
                onClick={() => handleKpiClick('alerts')}
              >
                <div className="min-w-0 flex-1" title='Alertas pendientes - DOF'>
                  <p className="text-sm font-medium text-gray-600 truncate text-left">Alertas pendientes - DOF</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{kpiData.pendingAlerts.dof}</p>
                  <div className="p-3 bg-[#A1A3A5]/25 rounded-full flex-shrink-0">
                    <Newspaper className="text-[#999996]" size={20} />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <Calendar className="text-black mr-1 flex-shrink-0" size={14} />
                  <span className="text-xs md:text-sm text-black truncate">Requieren atención</span>
                </div>
              </button>


            </div>

            {/* Gráfico de barras */}
            <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  documentos recientes
                </h3>
                <button
                  onClick={loadDashboardData}
                  className="flex items-center gap-2 px-3 py-2 bg-[#999996] text-white rounded-lg hover:bg-[#A1A3A5] transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Recargar datos</span>
                </button>
              </div>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="mx-auto mb-4 text-gray-400 animate-spin" size={48} />
                  <p className="text-gray-600 mb-2">Cargando datos del día...</p>
                  <p className="text-sm text-gray-500">Por favor espera mientras se actualizan los gráficos.</p>
                </div>
              ) : chartData.every(item => item.documents === 0) ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto mb-4 text-gray-300" size={48} />
                  <p className="text-gray-600 mb-2">Aún no hay datos disponibles para mostrar hoy.</p>
                  <p className="text-sm text-gray-500">Los gráficos se actualizarán cuando se capturen documentos.</p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {chartData.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 md:gap-4">
                      <div className="w-32 md:w-48 text-xs md:text-sm text-gray-600 flex-shrink-0">
                        {item.source}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-5 md:h-6 relative min-w-0">
                        <div 
                          className="bg-[#999996] h-5 md:h-6 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${chartData.length > 0 && Math.max(...chartData.map(d => d.documents)) > 0 
                              ? (item.documents / Math.max(...chartData.map(d => d.documents))) * 100 
                              : 0}%` 
                          }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {item.documents} Documentos
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabla de documentos del día */}
            <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Documentos del día ({documentsToday.length})
                </h3>
                <div className="flex items-center space-x-4">
                   <div className="text-sm text-gray-500">
                     Mostrando documentos recientes
                   </div>
                  {documentsToday.length > 0 && (
                    <button
                       onClick={exportToExcel}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Exportar Excel</span>
                    </button>
                  )}
                </div>
              </div>
              
              {documentsToday.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto mb-4 text-gray-300" size={48} />
                  <p className="text-gray-600 mb-2">No hay documentos capturados hoy.</p>
                  <p className="text-sm text-gray-500">Los documentos aparecerán aquí cuando se capturen.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Título
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Proponente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fuente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Temas
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documentsToday.map((document) => (
                        <tr key={document.id_senado_doc} className="hover:bg-gray-50">
                           <td className="px-4 py-3">
                             <div className="text-sm text-gray-900 font-mono">
                               {document.id_senado_doc}
                             </div>
                           </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900 max-w-xs">
                               {truncateText(document.iniciativa_texto?.toUpperCase() || 'SIN TÍTULO', 80)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900 max-w-xs">
                              {truncateText(document.correspondier || document.personas || 'Sin proponente', 40)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              document.fuente === 'senado' ? 'bg-purple-100 text-purple-800' :
                              document.fuente === 'diputados' ? 'bg-green-100 text-green-800' :
                              document.fuente === 'dof' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {document.fuente === 'senado' ? 'Cámara de Senadores' : 
                               document.fuente === 'diputados' ? 'Cámara de Diputados' :
                               document.fuente === 'dof' ? 'Diario Oficial de la Federación' :
                               document.fuente}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              {formatDate(document.created_at)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center text-sm text-gray-900 max-w-xs">
                              <Tag className="w-4 h-4 mr-2 text-gray-400" />
                              {truncateText(document.temas || 'Sin temas', 40)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {document.tipo || 'Sin tipo'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'}
        fixed md:relative inset-y-0 left-0 z-50 md:z-auto
        w-64 bg-white shadow-lg 
        transition-all duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Header del sidebar */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {/* Logo y título - siempre visible en móvil, condicional en desktop */}
          {(!sidebarCollapsed || mobileMenuOpen) && (
            <div className="flex items-center justify-center">
              <div className="w-24 h-20 flex items-center justify-center">
                <img 
                  src={logoNegro} 
                  alt="GEP Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
          
          {/* Botón de colapsar/expandir */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100
              transition-all duration-200
              ${sidebarCollapsed ? 'ml-auto' : ''}
            `}
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
          
          {/* Botón de cerrar para móvil */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {allowedModules.filter(module => module !== 'companies').map((module) => {
              // Para todos los módulos, mostrar normalmente (sin submenú especial para alerts)
              return (
                <li key={module}>
                  <button
                    onClick={() => {
                      handleSectionChange(module)
                      setMobileMenuOpen(false)
                    }}
                    className={`
                      w-full flex items-center p-3 rounded-lg text-left
                      transition-all duration-200
                      ${activeSection === module 
                        ? 'bg-[#D4133D] text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                      ${sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : 'justify-start'}
                    `}
                    title={sidebarCollapsed && !mobileMenuOpen ? moduleLabels[module] : undefined}
                  >
                    <div className="flex-shrink-0">
                      {moduleIcons[module]}
                    </div>
                    {(!sidebarCollapsed || mobileMenuOpen) && (
                      <span className="ml-3 font-medium">{moduleLabels[module]}</span>
                    )}
                  </button>
                </li>
              )
            })}
            
            {/* Cerrar Sesión como último elemento del menú */}
            <li>
              <button
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                className={`
                  w-full flex items-center p-3 rounded-lg text-left
                  text-red-600 hover:bg-red-50 hover:text-red-700
                  transition-all duration-200
                  ${sidebarCollapsed && !mobileMenuOpen ? 'justify-center' : 'justify-start'}
                `}
                title={sidebarCollapsed && !mobileMenuOpen ? 'Cerrar Sesión' : undefined}
              >
                <div className="flex-shrink-0">
                  <LogOut size={20} />
                </div>
                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <span className="ml-3 font-medium">Cerrar Sesión</span>
                )}
              </button>
            </li>
          </ul>
        </nav>

        {/* Información del sistema */}
        <div className="p-4 border-t border-gray-200">
          {/* Versión del sistema */}
          {(!sidebarCollapsed || mobileMenuOpen) && (
            <div className="px-3 py-2 text-center">
              <p className="text-xs text-gray-500">
                GEP AI
              </p>
              <p className="text-xs text-gray-400 font-mono">
                v1.4.1
              </p>
            </div>
          )}
          
          {/* Versión compacta para sidebar colapsado */}
          {sidebarCollapsed && !mobileMenuOpen && (
            <div className="text-center">
              <p className="text-xs text-gray-400 font-mono transform rotate-90 whitespace-nowrap">
                v1.3.9
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Botón hamburger para móvil */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu size={20} />
              </button>
              
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                  {getPageTitle()}
                </h2>
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  {currentDate.toLocaleDateString('es-MX', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="text-right">
                <span className="text-xs md:text-sm text-gray-600 truncate max-w-[150px] md:max-w-none block">
                  {user?.email}
                </span>
                <span className="text-xs text-gray-500 block">
                  {userRole}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>

      {/* Modal de confirmación de logout */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              ¿Estás seguro de que deseas cerrar sesión?
            </h3>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={logoutLoading}
              >
                Cancelar
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Cerrando sesión...</span>
                  </>
                ) : (
                  <span>Cerrar Sesión</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard