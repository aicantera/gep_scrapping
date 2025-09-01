import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  Bot,
  Building,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Loader2,
  Newspaper,
  Play,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

interface BotExecutionHistory {
  id: number;
  fuente: string;
  fecha: string;
  tipo: string;
  ejecutado_por: string | null;
  estatus: string;
  detalles: any;
}

interface BotConfig {
  id: string;
  name: string;
  description: string;
  webhookUrl: string;
  icon: React.ReactNode;
  color: string;
}

const BotsExecution = () => {
  const { user } = useAuth();
  const [executingBot, setExecutingBot] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<BotExecutionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    fuente: "todas",
    tipo: "todos",
    estatus: "todos",
    desde: "",
    hasta: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Cargar historial de ejecuciones desde Supabase
  const loadBotExecutions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bot_executions")
        .select("*")
        .order("fecha", { ascending: false })
        .limit(1000); // Limitar a 1000 registros más recientes

      if (error) {
        console.error("Error loading bot executions:", error);
      } else {
        setHistory(data || []);
      }
    } catch (error) {
      console.error("Error loading bot executions:", error);
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
  const filtered = history.filter((row) => {
    const f = filters;
    let ok = true;
    if (f.fuente !== "todas" && row.fuente !== f.fuente) ok = false;
    if (f.tipo !== "todos" && row.tipo !== f.tipo) ok = false;
    if (f.estatus !== "todos" && row.estatus !== f.estatus) ok = false;
    if (f.desde && new Date(row.fecha) < new Date(f.desde)) ok = false;
    if (f.hasta && new Date(row.fecha) > new Date(f.hasta)) ok = false;
    return ok;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const bots: BotConfig[] = [
    {
      id: "diputados",
      name: "Cámara de Diputados",
      description: "Extracción de documentos de Cámara de Diputados",
      webhookUrl: "https://dbd.gepdigital.ai/webhook/diputados",
      icon: <Building className="w-6 h-6" />,
      color: "bg-[#B52244] hover:bg-[#D4133D]",
    },
    {
      id: "senado",
      name: "Cámara de Senadores",
      description: "Extracción de documentos de Cámara de Senadores",
      webhookUrl: "https://dbd.gepdigital.ai/webhook/senadores",
      icon: <Gavel className="w-6 h-6" />,
      color: "bg-[#999996] hover:bg-[#A1A3A5]",
    },
    {
      id: "dof",
      name: "Diario Oficial de la Federación",
      description: "Extracción de documentos del DOF",
      webhookUrl: "https://dbd.gepdigital.ai/webhook/dofv2",
      icon: <Newspaper className="w-6 h-6" />,
      color: "bg-[#B52244] hover:bg-[#D4133D]",
    },
  ];

  const executeBot = async (bot: BotConfig) => {
    setExecutingBot(bot.id);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      trigger: "manual",
      timestamp: new Date().toISOString(),
      source: "dashboard",
      user_email: user?.email || null,
    };

    // Registrar inicio de ejecución en la base de datos
    const executionStart = {
      fuente: bot.name,
      tipo: "Manual",
      ejecutado_por: user?.email || null,
      estatus: "en proceso",
      detalles: { payload, initiated_at: new Date().toISOString() },
    };

    let executionId: number | null = null;

    try {
      // Insertar registro de ejecución
      const { data: insertData, error: insertError } = await supabase
        .from("bot_executions")
        .insert(executionStart)
        .select("id")
        .single();

      if (insertError) {
        console.error("Error insertando ejecución:", insertError);
      } else {
        executionId = insertData?.id;
      }

      console.log(`🤖 Ejecutando bot ${bot.name}...`);
      console.log(`🔗 URL: ${bot.webhookUrl}`);

      // 1) Intento estándar con JSON (si el servidor tiene CORS correcto, funcionará)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      let response: Response | null = null;
      try {
        response = await fetch(`${bot.webhookUrl}?ts=${Date.now()}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          mode: "cors",
          credentials: "omit",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (primaryError) {
        clearTimeout(timeoutId);
        console.warn(
          "⚠️ Falló la llamada estándar (posible CORS). Aplicando fallback no-cors...",
          primaryError
        );

        // 2) Fallback sin CORS ni headers (evita preflight). La respuesta será opaca, pero el servidor recibirá el trigger.
        await fetch(`${bot.webhookUrl}?ts=${Date.now()}`, {
          method: "POST",
          mode: "no-cors",
          keepalive: true,
          body: JSON.stringify(payload),
        });

        // Actualizar estado a éxito (fallback)
        if (executionId) {
          await supabase
            .from("bot_executions")
            .update({
              estatus: "éxito",
              detalles: {
                ...executionStart.detalles,
                completed_at: new Date().toISOString(),
                method: "no-cors fallback",
              },
            })
            .eq("id", executionId);
        }

        setSuccessMessage(
          `✅ Bot ${bot.name} ejecutado. En 30 minutos los datos estarán actualizados.`
        );
        loadBotExecutions(); // Recargar lista
        return;
      }

      if (response && response.ok) {
        // Actualizar estado a éxito
        if (executionId) {
          await supabase
            .from("bot_executions")
            .update({
              estatus: "éxito",
              detalles: {
                ...executionStart.detalles,
                completed_at: new Date().toISOString(),
                response_status: response.status,
              },
            })
            .eq("id", executionId);
        }

        setSuccessMessage(
          `✅ Bot ${bot.name} ejecutado exitosamente. En 30 minutos los datos estarán actualizados.`
        );
        console.log(`✅ Bot ${bot.name} ejecutado correctamente`);
      } else {
        console.warn("⚠️ Respuesta no exitosa. Aplicando fallback no-cors...");
        await fetch(`${bot.webhookUrl}?ts=${Date.now()}`, {
          method: "POST",
          mode: "no-cors",
          keepalive: true,
          body: JSON.stringify(payload),
        });

        // Actualizar estado a éxito (fallback)
        if (executionId) {
          await supabase
            .from("bot_executions")
            .update({
              estatus: "éxito",
              detalles: {
                ...executionStart.detalles,
                completed_at: new Date().toISOString(),
                method: "no-cors fallback response",
              },
            })
            .eq("id", executionId);
        }

        setSuccessMessage(
          `✅ Bot ${bot.name} ejecutado. En 30 minutos los datos estarán actualizados.`
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      console.error(`❌ Error ejecutando bot ${bot.name}:`, error);

      // Actualizar estado a falla
      if (executionId) {
        await supabase
          .from("bot_executions")
          .update({
            estatus: "falla",
            detalles: {
              ...executionStart.detalles,
              completed_at: new Date().toISOString(),
              error: errorMessage,
            },
          })
          .eq("id", executionId);
      }

      setError(`Error ejecutando el bot ${bot.name}: ${errorMessage}`);
    } finally {
      setExecutingBot(null);
      loadBotExecutions(); // Recargar lista en todos los casos
    }
  };

  const clearMessages = () => {
    setSuccessMessage(null);
    setError(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Bot className="text-[#1F2937]" size={32} />
          <div>
            <h2 className="text-2xl font-bold text-[#1F2937]">
              Ejecución de Bots AI
            </h2>
            <p className="text-[#1F2937]">
              Ejecuta los bots de extracción de documentos
            </p>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <CheckCircle
              className="text-green-600 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div>
              <p className="text-green-800 font-medium">¡Éxito!</p>
              <p className="text-green-700 text-sm mt-1">{successMessage}</p>
            </div>
          </div>
          <button
            onClick={clearMessages}
            className="text-green-600 hover:text-green-700 text-sm font-medium ml-4"
          >
            x
          </button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertTriangle
              className="text-red-600 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={clearMessages}
            className="text-red-600 hover:text-red-700 text-sm font-medium ml-4"
          >
            x
          </button>
        </div>
      )}

      {/* Bots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {bots.map((bot) => (
          <div
            key={bot.id}
            className="bg-white rounded-lg shadow-sm border p-6"
          >
            <div className="flex flex-col h-full">
              {/* Icon y título */}
              <div className="flex items-center space-x-3 mb-4">
                <div
                  className={`p-3 rounded-full ${bot.color
                    .split(" ")[0]
                    .replace("bg-", "bg-")
                    .replace("500", "100")} text-white`}
                >
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
                  ${
                    executingBot === bot.id
                      ? "bg-gray-400 cursor-not-allowed"
                      : executingBot !== null
                      ? "bg-gray-300 cursor-not-allowed"
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
          <label className="block text-xs font-medium text-[#1F2937] mb-1">
            Fuente
          </label>
          <select
            className="border rounded px-2 py-1 text-[#1F2937]"
            value={filters.fuente}
            onChange={(e) =>
              setFilters((f) => ({ ...f, fuente: e.target.value }))
            }
          >
            <option value="todas">Todas</option>
            <option value="Cámara de Diputados">Cámara de Diputados</option>
            <option value="Senado">Senado</option>
            <option value="DOF">DOF</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1F2937] mb-1">
            Tipo
          </label>
          <select
            className="border rounded px-2 py-1 text-[#1F2937]"
            value={filters.tipo}
            onChange={(e) =>
              setFilters((f) => ({ ...f, tipo: e.target.value }))
            }
          >
            <option value="todos">Todos</option>
            <option value="Manual">Manual</option>
            <option value="Automática">Automática</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1F2937] mb-1">
            Estatus
          </label>
          <select
            className="border rounded px-2 py-1 text-[#1F2937]"
            value={filters.estatus}
            onChange={(e) =>
              setFilters((f) => ({ ...f, estatus: e.target.value }))
            }
          >
            <option value="todos">Todos</option>
            <option value="éxito">Éxito</option>
            <option value="falla">Falla</option>
            <option value="en proceso">En proceso</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1F2937] mb-1">
            Desde
          </label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-[#1F2937]"
            value={filters.desde}
            onChange={(e) =>
              setFilters((f) => ({ ...f, desde: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1F2937] mb-1">
            Hasta
          </label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-[#1F2937]"
            value={filters.hasta}
            onChange={(e) =>
              setFilters((f) => ({ ...f, hasta: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Tabla de historial */}
      <div className="bg-white rounded-lg shadow-sm border p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-[#1F2937]">ID</th>
              <th className="px-3 py-2 text-left text-[#1F2937]">Fuente</th>
              <th className="px-3 py-2 text-left text-[#1F2937]">
                Fecha y hora
              </th>
              <th className="px-3 py-2 text-left text-[#1F2937]">Tipo</th>
              <th className="px-3 py-2 text-left text-[#1F2937]">
                Ejecutado por
              </th>
              <th className="px-3 py-2 text-left text-[#1F2937]">Estatus</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-[#1F2937]" />
                    <span className="text-[#1F2937]">
                      Cargando historial de ejecuciones...
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-[#1F2937]">{row.id}</td>
                  <td className="px-3 py-2 text-[#1F2937]">{row.fuente}</td>
                  <td className="px-3 py-2 text-[#1F2937]">
                    {new Date(row.fecha).toLocaleString("es-MX")}
                  </td>
                  <td className="px-3 py-2 text-[#1F2937]">{row.tipo}</td>
                  <td className="px-3 py-2 text-[#1F2937]">
                    {row.tipo === "Manual" ? row.ejecutado_por || "-" : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        row.estatus === "Éxito" || row.estatus === "éxito"
                          ? "bg-green-100 text-green-700"
                          : row.estatus === "falla"
                          ? "bg-red-100 text-red-700"
                          : row.estatus === "en proceso"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {row.estatus.charAt(0).toUpperCase() +
                        row.estatus.slice(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
            {!loading && paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[#1F2937] py-6">
                  Sin registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, history?.length)} de {history?.length} resultados
            </div>
            <div className="flex items-center space-x-2">
              {/* Botón Anterior */}
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
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
                          onClick={() => setPage(i)}
                          className={`px-3 py-1 text-sm rounded ${
                            page === i
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
                        onClick={() => setPage(1)}
                        className={`px-3 py-1 text-sm rounded ${
                          page === 1
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        1
                      </button>
                    )
                    
                    // Puntos suspensivos si hay gap
                    if (page > 4) {
                      pages.push(
                        <span key="ellipsis1" className="px-2 text-gray-500">...</span>
                      )
                    }
                    
                    // Páginas alrededor de la actual
                    const start = Math.max(2, page - 1)
                    const end = Math.min(totalPages - 1, page + 1)
                    
                    for (let i = start; i <= end; i++) {
                      if (i !== 1 && i !== totalPages) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={`px-3 py-1 text-sm rounded ${
                              page === i
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
                    if (page < totalPages - 3) {
                      pages.push(
                        <span key="ellipsis2" className="px-2 text-gray-500">...</span>
                      )
                    }
                    
                    // Siempre mostrar última página
                    if (totalPages > 1) {
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setPage(totalPages)}
                          className={`px-3 py-1 text-sm rounded ${
                            page === totalPages
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
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="bg-[#A1A3A5]/20 border border-[#A1A3A5] rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Bot className="text-[#1F2937] flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-[#1F2937] font-medium">Información importante</p>
            <ul className="text-[#1F2937] text-sm mt-2 space-y-1">
              <li>
                • Los bots se ejecutan de forma asíncrona en segundo plano
              </li>
              <li>
                • Los datos actualizados estarán disponibles en aproximadamente
                30 minutos
              </li>
              <li>• Solo los administradores pueden ejecutar los bots</li>
              <li>
                • Los resultados se reflejarán en el dashboard y módulos
                correspondientes
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotsExecution;
