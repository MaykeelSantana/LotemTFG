
import { io, Socket } from 'socket.io-client';
import type { RoomInfo } from '../types/room.types';
import { useAuthStore } from '../store/auth.store';
import type { PlayerInventoryItemClient } from '../types/inventory.types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const TOKEN_STORAGE_KEY = 'lotem_auth_token';

/**
 * Servicio para gestionar la conexión y comunicación con el servidor Socket.IO.
 * Permite conectar, desconectar, emitir eventos y escuchar respuestas relacionadas con salas, catálogo, tienda e inventario.
 */
class SocketService {
    public socket: Socket | null = null;

    /**
     * Conecta con el servidor Socket.IO utilizando el token almacenado en localStorage.
     * Si ya está conectado, no realiza ninguna acción.
     */
    public connect() {
        if (this.socket && this.socket.connected) {
            console.log("Socket.IO ya está conectado.");
            return;
        }
        if (this.socket && this.socket.disconnected) {
            console.log("Socket.IO existe pero desconectado, intentando reconectar...");
            this.socket.connect();
            return;
        }

        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        console.log(`SocketService: Intentando conectar a Socket.IO en ${SOCKET_URL}`);
        if (token) {
            console.log("SocketService: Conectando con token de autenticación.");
        } else {
            console.warn("SocketService: Conectando sin token de autenticación. La conexión podría ser rechazada por el servidor.");
        }

        this.socket = io(SOCKET_URL, {
            autoConnect: false,
            auth: {
                token: token || undefined
            },
        });

        this.socket.on("connect", () => {
            if (this.socket) {
                console.log("Socket.IO: Conectado al servidor con ID:", this.socket.id);
            }
        });

        this.socket.on("disconnect", (reason) => {
            console.log("Socket.IO: Desconectado del servidor, razón:", reason);
            if (reason === "io server disconnect") {
                console.error("Socket.IO: El servidor rechazó la conexión o la cerró activamente.");
            }
        });

        this.socket.on("connect_error", (err) => {
            console.error("Socket.IO: Error de conexión con Socket.IO:", err.message);
        });

        this.socket.connect();
    }

    /**
     * Desconecta del servidor Socket.IO y limpia la instancia del socket.
     */
    public disconnect() {
        if (this.socket && this.socket.connected) {
            console.log("SocketService: Desconectando de Socket.IO...");
            this.socket.disconnect();
        }
        this.socket = null;
        console.log("SocketService: Instancia del socket limpiada.");
    }

    /**
     * Actualiza el token de autenticación y reconecta con el servidor.
     */
    public updateTokenAndReconnect() {
        console.log("SocketService: updateTokenAndReconnect llamado.");
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connect();
    }

    /**
     * Emite un evento genérico al servidor.
     * @param eventName Nombre del evento.
     * @param data Datos opcionales a enviar.
     */
    public emit(eventName: string, data?: any) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(eventName, data);
        } else {
            console.warn(`Socket.IO no conectado. No se pudo emitir el evento '${eventName}'.`);
        }
    }

    /**
     * Solicita las salas creadas por el usuario.
     * @param callback Función que recibe la respuesta del servidor.
     */
    public emitGetMyCreatedRooms(
        callback: (response: { success: boolean; rooms?: any[]; error?: string }) => void
    ) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('rooms:get_my_created', callback);
        } else {
            callback({ success: false, error: "Socket no conectado." });
        }
    }

    /**
     * Solicita los ítems del catálogo con filtros opcionales.
     * @param filters Filtros de búsqueda.
     * @param callback Función que recibe la respuesta del servidor.
     */
    public emitGetCatalogItems(
        filters: { category?: string; name?: string } = {},
        callback: (response: { success: boolean; items?: any[]; error?: string }) => void
    ) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('catalog:get_items', filters, (responseFromServer: { success: boolean; items?: any[]; error?: string }) => {
                callback(responseFromServer);
            });
        } else {
            callback({ success: false, error: "Socket no conectado." });
        }
    }

    /**
     * Solicita la compra de un ítem del catálogo.
     * @param catalogItemId ID del ítem a comprar.
     * @param callback Función que recibe la respuesta del servidor.
     */
    public emitBuyItem(
        catalogItemId: string,
        callback: (response: { success: boolean; message?: string; inventoryItem?: any; newBalance?: number }) => void
    ) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('shop:buy_item', { catalogItemId }, (responseFromServer: { success: boolean; message?: string; inventoryItem?: any; newBalance?: number }) => {
                callback(responseFromServer);
                if (responseFromServer.success && responseFromServer.newBalance !== undefined) {
                    useAuthStore.getState().updateCurrencyBalance(responseFromServer.newBalance);
                }
            });
        } else {
            callback({ success: false, message: "Socket no conectado." });
        }
    }

    /**
     * Solicita los ítems del inventario del usuario.
     * @param callback Función que recibe la respuesta del servidor.
     */
    public emitGetInventory(
        callback: (response: { success: boolean; items?: PlayerInventoryItemClient[]; error?: string }) => void
    ) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('inventory:get_items', (responseFromServer: { success: boolean; items?: PlayerInventoryItemClient[]; error?: string }) => {
                callback(responseFromServer);
            });
        } else {
            callback({ success: false, error: "Socket no conectado." });
        }
    }

    /**
     * Solicita colocar un ítem del inventario en una sala.
     * @param payload Datos necesarios para colocar el ítem.
     * @param callback Función que recibe la respuesta del servidor.
     */
    public emitPlaceItemInRoom(
        payload: { roomId: string; playerInventoryItemId: string; x: number; y: number; rotation?: number },
        callback: (response: { success: boolean; placedItem?: any; error?: string }) => void
    ) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('room:place_item', payload, callback);
        } else {
            callback({ success: false, error: "Socket no conectado." });
        }
    }

    /**
     * Configura listeners para eventos relacionados con la tienda.
     */
    public setupShopListeners() {
        if (!this.socket) return;
        this.socket.on('shop:purchase_result', (data: { success: boolean; message?: string; inventoryItem?: any; newBalance?: number }) => {
            console.log('SocketService: Recibido shop:purchase_result', data);
        });
    }

    /**
     * Configura listeners para eventos específicos del usuario, como actualizaciones de saldo o inventario.
     */
    public setupUserSpecificListeners() {
        if (!this.socket) return;
        this.socket.on('user:currency_update', (data: { newBalance: number }) => {
            useAuthStore.getState().updateCurrencyBalance(data.newBalance);
        });

        this.socket.on('inventory:items_update', (items: any[]) => {
            console.log('SocketService: Recibido inventory:items_update', items);
        });
    }
}

export const socketService = new SocketService();
