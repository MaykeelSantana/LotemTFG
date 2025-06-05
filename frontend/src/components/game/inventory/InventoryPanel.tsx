import React, { useEffect, useState, useCallback } from 'react';
import { socketService } from '../../../services/socket.service'; 
import type { PlayerInventoryItemClient } from '../../../types/inventory.types'; 

interface InventoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectItemForPlacement: (item: PlayerInventoryItemClient) => void;
}

/**
 * El componente InventoryPanel muestra el inventario del jugador en un panel modal.
 * 
 * @component
 * @param {InventoryPanelProps} props - Las propiedades del componente InventoryPanel.
 * @param {boolean} props.isOpen - Determina si el panel de inventario está abierto y visible.
 * @param {() => void} props.onClose - Función de devolución de llamada para cerrar el panel de inventario.
 * @param {(item: PlayerInventoryItemClient) => void} props.onSelectItemForPlacement - Función de devolución de llamada cuando se selecciona un objeto para colocación.
 * 
 * @returns {JSX.Element | null} El panel de inventario renderizado, o null si no está abierto.
 * 
 * @remarks
 * - Obtiene los objetos del inventario desde el servidor mediante una conexión por socket al abrirse.
 * - Escucha actualizaciones en tiempo real del inventario a través del evento de socket 'inventory:items_update'.
 * - Muestra estados de carga y error.
 * - Permite al usuario seleccionar objetos colocables para su colocación.
 * - Reinicia el estado al cerrarse.
 */

const InventoryPanel: React.FC<InventoryPanelProps> = ({ isOpen, onClose, onSelectItemForPlacement }) => {
    const [inventoryItems, setInventoryItems] = useState<PlayerInventoryItemClient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInventoryItems = useCallback(() => {
        if (!socketService.socket || !socketService.socket.connected) {
            setError("Socket no conectado. No se puede cargar el inventario.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        console.log("InventoryPanel: Solicitando items del inventario...");
        socketService.emitGetInventory((response) => {
            setIsLoading(false);
            if (response.success && response.items) {
                console.log("InventoryPanel: Items de inventario recibidos:", response.items);
                setInventoryItems(response.items);
            } else {
                console.error("InventoryPanel: Error al obtener items del inventario:", response.error);
                setError(response.error || "Error desconocido al cargar el inventario.");
                setInventoryItems([]);
            }
        });
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchInventoryItems(); 

            const handleInventoryUpdate = (items: PlayerInventoryItemClient[]) => {
                console.log("InventoryPanel: Actualización de inventario recibida vía evento", items);
                setInventoryItems(items);
            };
            socketService.socket?.on('inventory:items_update', handleInventoryUpdate);

            return () => {
                socketService.socket?.off('inventory:items_update', handleInventoryUpdate);
            };

        } else {
            setInventoryItems([]);
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen, fetchInventoryItems]);

    const handleSelectAndClose = (item: PlayerInventoryItemClient) => {
        onSelectItemForPlacement(item);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-slate-800 text-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold text-lime-400">Mi Inventario</h2>
                    <button onClick={onClose} className="text-red-500 hover:text-red-400 text-3xl font-bold">&times;</button>
                </div>

                {isLoading && <p className="text-center text-yellow-400 text-lg">Cargando inventario...</p>}
                {error && <p className="text-center text-red-400 bg-red-900 p-3 rounded-md">Error: {error}</p>}

                <div className="overflow-y-auto flex-grow pr-2"> 
                    {inventoryItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inventoryItems.map(invItem => (
                                <div key={invItem.id} className="bg-slate-700 p-3 rounded-lg shadow-md flex flex-col justify-between">
                                    <div>
                                        <img
                                            src={`/assets/items_catalog/${invItem.catalogItem.assetKey}.png`}
                                            alt={invItem.catalogItem.name}
                                            className="w-full h-32 object-contain mb-2 bg-slate-600 rounded-md border border-slate-500"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null; 
                                                e.currentTarget.src = '/assets/items_catalog/placeholder.png'; 
                                            }}
                                        />
                                        <h3 className="text-lg font-semibold text-lime-300 mb-1">{invItem.catalogItem.name}</h3>
                                        {invItem.quantity > 1 && (
                                            <p className="text-xs text-slate-400">Cantidad: {invItem.quantity}</p>
                                        )}
                                    </div>
                                    {invItem.catalogItem.isPlaceableInRoom && (
                                        <button
                                            onClick={() => handleSelectAndClose(invItem)} 
                                            className="mt-2 w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 px-3 rounded text-sm transition-colors"
                                        >
                                            Colocar
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        !isLoading && !error && <p className="text-center text-slate-400 text-lg mt-10">Tu inventario está vacío.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryPanel;