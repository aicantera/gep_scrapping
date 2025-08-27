import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  Building,
  Calendar,
  Download,
  FileText,
  Gavel,
  Newspaper,
  RefreshCw,
  Tag,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { useNavigate } from "react-router-dom";

interface KPIData {
  documentsToday: number;
  alertsSent: {
    general: number;
    diputados: number;
    senado: number;
    dof: number;
  };
  pendingAlerts: {
    general: number;
    diputados: number;
    senado: number;
    dof: number;
  };
}

interface ChartData {
  source: string;
  documents: number;
}

interface Document {
  id_senado_doc: number;
  created_at: string;
  sinopsis: string;
  iniciativa_texto: string;
  iniciativa_id: string;
  gaceta: string;
  link_iniciativa: string;
  fuente: string;
  imagen_link: string;
  temas: string;
  personas: string;
  partidos: string;
  leyes: string;
  resumen: string;
  analisis: string;
  objeto: string;
  correspondier: string;
  tipo: string;
}

const DashboardHome = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpiData, setKpiData] = useState<KPIData>({
    documentsToday: 0,
    alertsSent: {
      general: 0,
      diputados: 0,
      senado: 0,
      dof: 0,
    },
    pendingAlerts: {
      general: 0,
      diputados: 0,
      senado: 0,
      dof: 0,
    },
  });
  const [chartData, setChartData] = useState<ChartData[]>([
    { source: "Cámara de Diputados", documents: 0 },
    { source: "Cámara de Senadores", documents: 0 },
    { source: "Diario Oficial de la Federación", documents: 0 },
  ]);
  const [documentsToday, setDocumentsToday] = useState<Document[]>([]);
  const fuentesDocumentos: string[] = [
    "Cámara de Diputados",
    "Cámara de Senadores",
    "Diario Oficial de la Federación",
  ];

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("📊 Cargando datos del dashboard del día actual...");

      // Calcular fecha del día actual
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // 1. Documentos capturados durante el día (desde tabla senado)
      const { count: documentsTodayCount, error: docsTodayError } =
        await supabase
          .from("senado")
          .select("*", { count: "exact", head: true })
          .gte("created_at", todayStr)
          .lt("created_at", todayStr + "T23:59:59.999Z");

      if (docsTodayError) {
        console.error("Error obteniendo documentos del día:", docsTodayError);
      }

      // 2. Obtener TODOS los documentos del día actual (sin paginación)
      const { data: allDocumentsToday, error: allDocsError } = await supabase
        .from("senado")
        .select("*")
        .gte("created_at", todayStr)
        .lt("created_at", todayStr + "T23:59:59.999Z")
        .order("created_at", { ascending: false });

      if (allDocsError) {
        console.error(
          "Error obteniendo todos los documentos del día:",
          allDocsError
        );
      } else {
        setDocumentsToday(allDocumentsToday || []);
        console.log(
          "📄 Documentos del día cargados:",
          (allDocumentsToday || []).length
        );
      }

      // 3. Documentos por fuente del día actual para el gráfico
      const { data: documentsTodayBySource, error: docsTodayError2 } =
        await supabase
          .from("senado")
          .select("fuente")
          .gte("created_at", todayStr)
          .lt("created_at", todayStr + "T23:59:59.999Z");

      if (docsTodayError2) {
        console.error(
          "Error obteniendo documentos por fuente del día:",
          docsTodayError2
        );
      }

      // Función para normalizar el nombre de la fuente
      const normalizarFuente = (fuente: string): string => {
        const fuenteLower = fuente.toLowerCase().trim();

        if (
          fuenteLower.includes("diputados") ||
          fuenteLower.includes("diputado")
        ) {
          return "diputados";
        }
        if (fuenteLower.includes("senado") || fuenteLower.includes("senador")) {
          return "senado";
        }
        if (
          fuenteLower.includes("dof") ||
          fuenteLower.includes("diario oficial")
        ) {
          return "dof";
        }

        return fuenteLower;
      };

      // Procesar datos por fuente del día actual
      const fuenteCount: Record<string, number> = {};
      documentsTodayBySource?.forEach((doc) => {
        const fuente = doc.fuente || "sin_fuente";
        const fuenteNormalizada = normalizarFuente(fuente);
        fuenteCount[fuenteNormalizada] =
          (fuenteCount[fuenteNormalizada] || 0) + 1;
      });

      console.log("📊 Documentos por fuente (día actual):", fuenteCount);
      console.log(
        "📊 Total de documentos procesados:",
        documentsTodayBySource?.length || 0
      );
      console.log("📊 Valores únicos de fuente encontrados:", [
        ...new Set(documentsTodayBySource?.map((d) => d.fuente) || []),
      ]);
      console.log("📊 Valores únicos de fuente normalizados:", [
        ...new Set(
          documentsTodayBySource?.map((d) =>
            normalizarFuente(d.fuente || "")
          ) || []
        ),
      ]);

      // 4. Alertas enviadas hoy (desde alertas_log con status_alerta = 1)
      const { data: alertasEnviadasHoy, error: alertasEnviadasError } =
        await supabase
          .from("alertas_log")
          .select("id_alerta, created_at")
          .eq("status_alerta", 1)
          .gte("created_at", todayStr)
          .lt("created_at", todayStr + "T23:59:59.999Z");

      if (alertasEnviadasError) {
        console.error(
          "Error obteniendo alertas enviadas del día:",
          alertasEnviadasError
        );
      }

      // 5. Alertas pendientes hoy (desde alertas_log con status_alerta = 0)
      const { data: alertasPendientesHoy, error: alertasPendientesError } =
        await supabase
          .from("alertas_log")
          .select("id_alerta, created_at")
          .eq("status_alerta", 0)
          .gte("created_at", todayStr)
          .lt("created_at", todayStr + "T23:59:59.999Z");

      if (alertasPendientesError) {
        console.error(
          "Error obteniendo alertas pendientes del día:",
          alertasPendientesError
        );
      }

      // 6. Obtener detalles de alertas para mapear por fuente
      const alertasIds = [
        ...(alertasEnviadasHoy || []).map((a) => a.id_alerta),
        ...(alertasPendientesHoy || []).map((a) => a.id_alerta),
      ];

      let alertasDetalles: Array<{
        id_alerta: number;
        temas: string | string[];
      }> = [];
      if (alertasIds.length > 0) {
        const { data: alertasDetallesData, error: alertasDetallesError } =
          await supabase
            .from("alertas_directorio")
            .select("id_alerta, temas")
            .in("id_alerta", alertasIds);

        if (alertasDetallesError) {
          console.error(
            "Error obteniendo detalles de alertas:",
            alertasDetallesError
          );
        } else {
          alertasDetalles = alertasDetallesData || [];
        }
      }

      // Mapear alertas por fuente basándose en los temas
      const mapearFuentePorTemas = (temas: string[] | string): string => {
        const temasArray = Array.isArray(temas) ? temas : [temas];
        const temasStr = temasArray.join(" ").toLowerCase();

        if (
          temasStr.includes("diputados") ||
          temasStr.includes("cámara de diputados")
        )
          return "diputados";
        if (temasStr.includes("senado") || temasStr.includes("senadores"))
          return "senado";
        if (temasStr.includes("dof") || temasStr.includes("diario oficial"))
          return "dof";

        return "general";
      };

      // Contar alertas enviadas por fuente
      const alertasEnviadasPorFuente: Record<string, number> = {
        general: 0,
        diputados: 0,
        senado: 0,
        dof: 0,
      };

      alertasEnviadasHoy?.forEach((alerta) => {
        const detalle = alertasDetalles.find(
          (d) => d.id_alerta === alerta.id_alerta
        );
        const fuente = mapearFuentePorTemas(detalle?.temas || []);
        alertasEnviadasPorFuente[fuente]++;
      });

      // Contar alertas pendientes por fuente
      const alertasPendientesPorFuente: Record<string, number> = {
        general: 0,
        diputados: 0,
        senado: 0,
        dof: 0,
      };

      alertasPendientesHoy?.forEach((alerta) => {
        const detalle = alertasDetalles.find(
          (d) => d.id_alerta === alerta.id_alerta
        );
        const fuente = mapearFuentePorTemas(detalle?.temas || []);
        alertasPendientesPorFuente[fuente]++;
      });

      // Crear KPIs según nuevas especificaciones
      const realKpiData: KPIData = {
        documentsToday: documentsTodayCount || 0,
        alertsSent: {
          general: alertasEnviadasPorFuente.general,
          diputados: alertasEnviadasPorFuente.diputados,
          senado: alertasEnviadasPorFuente.senado,
          dof: alertasEnviadasPorFuente.dof,
        },
        pendingAlerts: {
          general: alertasPendientesPorFuente.general,
          diputados: alertasPendientesPorFuente.diputados,
          senado: alertasPendientesPorFuente.senado,
          dof: alertasPendientesPorFuente.dof,
        },
      };

      // Crear datos del gráfico del día actual
      const realChartData: ChartData[] = [
        {
          source: "Cámara de Diputados",
          documents: fuenteCount["diputados"] || 0,
        },
        {
          source: "Cámara de Senadores",
          documents: fuenteCount["senado"] || 0,
        },
        {
          source: "Diario Oficial de la Federación",
          documents: fuenteCount["dof"] || 0,
        },
      ];

      console.log("✅ KPIs calculados:", realKpiData);
      console.log("✅ Datos del gráfico:", realChartData);
      console.log(
        "✅ Total de documentos en KPIs:",
        realKpiData.documentsToday
      );
      console.log(
        "✅ Total de documentos en gráficos:",
        realChartData.reduce((sum, item) => sum + item.documents, 0)
      );

      setKpiData(realKpiData);
      setChartData(realChartData);

      // Mostrar mensaje si no hay datos
      if (
        realKpiData.documentsToday === 0 &&
        realChartData.every((item) => item.documents === 0)
      ) {
        console.log("ℹ️ No hay datos disponibles para mostrar hoy");
      } else {
        console.log("✅ Datos disponibles para mostrar en gráficos");
      }
    } catch (error) {
      console.error("❌ Error cargando datos del dashboard:", error);
      setError(
        "No se pudieron cargar los datos del dashboard. Reintenta en unos minutos."
      );
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (documentsToday.length === 0) {
      alert("No hay documentos para exportar.");
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Documentos del Día");
    // Encabezados con todos los campos de la interfaz Document
    const headers = [
      "ID",
      "Fecha de creación",
      "Sinopsis",
      "Título",
      "ID Iniciativa",
      "Gaceta",
      "Link Iniciativa",
      "Fuente",
      "Imagen Link",
      "Temas",
      "Personas",
      "Partidos",
      "Leyes",
      "Resumen",
      "Análisis",
      "Objeto",
      "Proponente",
      "Tipo",
      "Correspondiente",
    ];
    worksheet.addRow(headers);
    documentsToday.forEach((doc) => {
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
    worksheet.columns.forEach((col) => {
      col.width = 25;
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `documentos_del_dia_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    if (!text) return "Sin información";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleKpiClick = (
    route: "gestion-documental" | "alertas-monitoreo"
  ) => {
    navigate(`/${route}`);
  };

  useEffect(() => {
    // Cargar los documentos al iniciar el componente, y mantenerlos actualizados cada 10 min
    loadDashboardData();

    const interval = setInterval(loadDashboardData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header del Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            Bienvenido, {user?.email} ({userRole})
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#999996] text-white rounded-lg hover:bg-[#A1A3A5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Documentos capturados hoy */}
        <button
          type="button"
          className="metric-card hover:shadow-md transition-shadow"
          onClick={() => handleKpiClick("gestion-documental")}
        >
          <div className="min-w-0" title="Documentos capturados hoy">
            <p className="text-sm font-medium text-gray-600 truncate text-left">
              Documentos capturados hoy
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xl md:text-2xl font-bold text-gray-900">
              {kpiData.documentsToday}
            </p>
            <div className="p-3 bg-[#A1A3A5]/30 rounded-full flex-shrink-0">
              <FileText className="text-[#999996]" size={20} />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <TrendingUp className="text-black mr-1 flex-shrink-0" size={14} />
            <span className="text-xs md:text-sm text-black truncate">
              Capturados el día de hoy
            </span>
          </div>
        </button>

        {/* Alertas pendientes - General */}
        <button
          type="button"
          className="metric-card hover:shadow-md transition-shadow"
          onClick={() => handleKpiClick("alertas-monitoreo")}
        >
          <div className="min-w-0 flex-1" title="Alertas pendientes hoy">
            <p className="text-sm font-medium text-gray-600 truncate text-left">
              Alertas pendientes hoy
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xl md:text-2xl font-bold text-gray-900">
              {kpiData.pendingAlerts.general}
            </p>
            <div className="p-3 bg-[#D4133D]/25 rounded-full flex-shrink-0">
              <AlertTriangle className="text-[#B52244]" size={20} />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <Calendar className="text-black mr-1 flex-shrink-0" size={14} />
            <span className="text-xs md:text-sm text-black truncate">
              Requieren atención
            </span>
          </div>
        </button>

        {/* Alertas pendientes - Diputados */}
        <button
          type="button"
          className="metric-card hover:shadow-md transition-shadow"
          onClick={() => handleKpiClick("alertas-monitoreo")}
        >
          <div
            className="min-w-0 flex-1"
            title="Alertas pendientes - Diputados"
          >
            <p className="text-sm font-medium text-gray-600 truncate text-left">
              Alertas pendientes - Diputados
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xl md:text-2xl font-bold text-gray-900">
              {kpiData.pendingAlerts.diputados}
            </p>
            <div className="p-3 bg-[#A1A3A5]/25 rounded-full flex-shrink-0">
              <Building className="text-[#999996]" size={20} />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <Calendar className="text-black mr-1 flex-shrink-0" size={14} />
            <span className="text-xs md:text-sm text-black truncate">
              Requieren atención
            </span>
          </div>
        </button>

        {/* Alertas pendientes - Senado */}
        <button
          type="button"
          className="metric-card hover:shadow-md transition-shadow"
          onClick={() => handleKpiClick("alertas-monitoreo")}
        >
          <div className="min-w-0 flex-1" title="Alertas pendientes - Senado">
            <p className="text-sm font-medium text-gray-600 truncate text-left">
              Alertas pendientes - Senado
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xl md:text-2xl font-bold text-gray-900">
              {kpiData.pendingAlerts.senado}
            </p>
            <div className="p-3 bg-[#D4133D]/25 rounded-full flex-shrink-0">
              <Gavel className="text-[#B52244]" size={20} />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <Calendar className="text-black mr-1 flex-shrink-0" size={14} />
            <span className="text-xs md:text-sm text-black truncate">
              Requieren atención
            </span>
          </div>
        </button>

        {/* Alertas pendientes - DOF */}
        <button
          type="button"
          className="metric-card hover:shadow-md transition-shadow"
          onClick={() => handleKpiClick("alertas-monitoreo")}
        >
          <div className="min-w-0 flex-1" title="Alertas pendientes - DOF">
            <p className="text-sm font-medium text-gray-600 truncate text-left">
              Alertas pendientes - DOF
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xl md:text-2xl font-bold text-gray-900">
              {kpiData.pendingAlerts.dof}
            </p>
            <div className="p-3 bg-[#A1A3A5]/25 rounded-full flex-shrink-0">
              <Newspaper className="text-[#999996]" size={20} />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <Calendar className="text-black mr-1 flex-shrink-0" size={14} />
            <span className="text-xs md:text-sm text-black truncate">
              Requieren atención
            </span>
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
            <RefreshCw
              className="mx-auto mb-4 text-gray-400 animate-spin"
              size={48}
            />
            <p className="text-gray-600 mb-2">Cargando datos del día...</p>
            <p className="text-sm text-gray-500">
              Por favor espera mientras se actualizan los gráficos.
            </p>
          </div>
        ) : chartData.every((item) => item.documents === 0) ? (
          <div className="text-center py-8">
            <FileText className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-gray-600 mb-2">
              Aún no hay datos disponibles para mostrar hoy.
            </p>
            <p className="text-sm text-gray-500">
              Los gráficos se actualizarán cuando se capturen documentos.
            </p>
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
                      width: `${
                        chartData.length > 0 &&
                        Math.max(...chartData.map((d) => d.documents)) > 0
                          ? (item.documents /
                              Math.max(...chartData.map((d) => d.documents))) *
                            100
                          : 0
                      }%`,
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
            <p className="text-gray-600 mb-2">
              No hay documentos capturados hoy.
            </p>
            <p className="text-sm text-gray-500">
              Los documentos aparecerán aquí cuando se capturen.
            </p>
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
                        {truncateText(
                          document.iniciativa_texto?.toUpperCase() ||
                            "SIN TÍTULO",
                          80
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {truncateText(
                          document.correspondier ||
                            document.personas ||
                            "Sin proponente",
                          40
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          document.fuente === "senado"
                            ? "bg-purple-100 text-purple-800"
                            : document.fuente === "diputados"
                            ? "bg-green-100 text-green-800"
                            : document.fuente === "dof"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {document.fuente === "senado"
                          ? "Cámara de Senadores"
                          : document.fuente === "diputados"
                          ? "Cámara de Diputados"
                          : document.fuente === "dof"
                          ? "Diario Oficial de la Federación"
                          : document.fuente}
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
                        {truncateText(document.temas || "Sin temas", 40)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {document.tipo
                          ? document.fuente === fuentesDocumentos[2]
                            ? "Proyecto"
                            : document.tipo
                          : "Sin tipo"}
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
  );
};

export default DashboardHome;
