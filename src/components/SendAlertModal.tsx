import { supabase } from "@/lib/supabase";
// import { ESTATUS_DOC_OPTIONS } from "@/utils/SelectOptions";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const SendAlertModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  document: any;
}> = ({ isOpen, onClose, document }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<{
    [id: string]: boolean;
  }>({});
  const [selectedLists, setSelectedLists] = useState<{
    [clientId: string]: { [listId: string]: boolean };
  }>({});
  const [search, setSearch] = useState<string>("");
  const [isPending, setIsPending] = useState(false);

  const getClient = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from("clientes").select("*");

      if (error) throw error;

      // Transform data (listas_distribucion from string to array)
      const transformedData =
        data?.map((client) => {
          let listas_distribucion: any[] = [];

          if (client.listas_distribucion) {
            if (typeof client.listas_distribucion === 'string') {
              try {
                listas_distribucion = JSON.parse(client.listas_distribucion)
              } catch (e) {
                console.warn('Error parseando listas_distribucion para cliente:', client.id_cliente, e)
                listas_distribucion = [];
              }
            } else if (Array.isArray(client.listas_distribucion)) {
              listas_distribucion = client.listas_distribucion;
            }
          }

          return {
            ...client,
            listas_distribucion: listas_distribucion
          }
        }) || [];

      setClients(transformedData);
      setError(null);
    } catch (error) {
      console.log("🚀 ~ getClient ~ error:", error);
      setError("Error al obtener los clientes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      getClient();
    }
  }, [isOpen]);

  // Filtrado de clientes por nombre
  const filteredClients = clients.filter((client) =>
    client.nombre_cliente?.toLowerCase().includes(search.toLowerCase())
  );

  // Maneja el cambio de selección de cliente
  const handleClientCheck = (clientId: string) => {
    setSelectedClients((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
    // Si se deselecciona, limpia las listas seleccionadas
    if (selectedClients[clientId]) {
      setSelectedLists((prev) => {
        const copy = { ...prev };
        delete copy[clientId];
        return copy;
      });
    }
  };

  // Maneja el cambio de selección de lista
  const handleListCheck = (clientId: string, listId: string) => {
    setSelectedLists((prev) => ({
      ...prev,
      [clientId]: {
        ...(prev[clientId] || {}),
        [listId]: !prev[clientId]?.[listId],
      },
    }));
  };

  // Estructura la info seleccionada para el envío
  const getSelectedStructure = () => {
    return Object.entries(selectedClients)
      .filter(([_clientId, checked]) => checked)
      .map(([clientId]) => {
        const client = clients.find((c) => c.id_cliente === clientId);
        if (!client) return null;
        const listas = client.listas_distribucion
          .filter((lista: any) => selectedLists[clientId]?.[lista.id])
          .map((lista: any) => ({
            id: lista.id,
            correos: lista.correos,
          }));
        if (listas.length === 0) return null;
        return {
          id_cliente: clientId,
          listas_distribucion: listas,
        };
      })
      .filter(Boolean);
  };

  // Manejo del envio de la alerta
  const handleSendAlert = async () => {
    // Validación: debe haber al menos un cliente seleccionado
    const selectedClientIds = Object.entries(selectedClients)
      .filter(([_clientId, checked]) => checked)
      .map(([clientId]) => clientId);

    if (selectedClientIds.length === 0) {
      setErrorMsg("Debes seleccionar al menos un cliente.");
      return;
    }

    // Validación: cada cliente seleccionado debe tener al menos una lista seleccionada
    const invalidClient = selectedClientIds.find(
      (clientId) =>
        !selectedLists[clientId] ||
        Object.values(selectedLists[clientId]).filter(Boolean).length === 0
    );

    if (invalidClient) {
      setErrorMsg(
        "Cada cliente seleccionado debe tener al menos una lista de distribución seleccionada."
      );
      return;
    }

    setErrorMsg(null);

    // Estructura la info seleccionada
    const clientes = getSelectedStructure();
    const body = {
      clientes,
      id_doc_senado: document?.id_senado_doc,
      fuente: document?.fuente,
      temas: document?.temas,
      titulo: document?.titulo,
      documento_html: document?.documento_html,
      estado: document?.estado,
    };

    try {
      setIsPending(true);
      const resp = await fetch(
        "https://dbd.gepdigital.ai/webhook/alertas_manuales",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (!resp.ok) throw new Error("Error en la solicitud");
      toast.success("Alerta creada con éxito");
      onClose();
    } catch (error) {
      console.log("🚀 ~ handleSendAlert ~ error:", error);
      toast.error("Error al enviar la alerta");
    } finally {
      setIsPending(false);
    }
  };

  if (!isOpen) return null;
  if (isLoading) return <LoadingIndicator />;
  if (error) return <ErrorIndicator message={error} onClose={onClose} />;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 p-6">
        <h2 className="text-lg font-semibold mb-4 text-stone-900">
          Crear Alerta Para Documento #{document?.id_senado_doc}
        </h2>

        {/* Campo de búsqueda */}
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-4 px-3 py-2 border rounded focus:outline-none focus:ring"
        />

        {/* Mensaje de error de validación */}
        {errorMsg && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="text-sm block sm:inline">{errorMsg}</span>
          </div>
        )}

        {/* Sistema de checks */}
        <div className="mb-4">
          <h3 className="font-medium mb-2">
            Selecciona clientes y listas de distribución:
          </h3>
          {filteredClients.map((client) => (
            <div key={client.id_cliente} className="mb-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={!!selectedClients[client.id_cliente]}
                  onChange={() => handleClientCheck(client.id_cliente)}
                  className="mr-2 accent-[#17468e]"
                />
                {client.nombre_cliente}
              </label>
              {/* Si el cliente está seleccionado, muestra sus listas */}
              {selectedClients[client.id_cliente] && (
                <div className="ml-6">
                  {client.listas_distribucion.map((lista: any) => (
                    <label key={lista.id} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                        checked={!!selectedLists[client.id_cliente]?.[lista.id]}
                        onChange={() =>
                          handleListCheck(client.id_cliente, lista.id)
                        }
                        className="mr-2 accent-[#17468e]"
                      />
                      {lista.nombre}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="text-gray-500 text-sm mt-2">
              No se encontraron clientes.
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          >
            Cancelar
          </button>
          <button
            onClick={handleSendAlert}
            className="px-4 py-2 bg-[#D4133D] text-white rounded-lg hover:bg-[#b8032a] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          >
            <Save className="w-4 h-4" />
            <span>{isPending ? "Enviando..." : "Generar Alerta"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ErrorIndicator: React.FC<{ message: string; onClose: () => void }> = ({
  message,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg w-96 p-6">
      <h2 className="text-lg font-semibold mb-4">Error</h2>
      <p>{message}</p>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
);

const LoadingIndicator: React.FC = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg w-96 p-6">
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    </div>
  </div>
);

export default SendAlertModal;
