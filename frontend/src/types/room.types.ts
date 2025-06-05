/**
 * Estado posible de una sala desde el punto de vista del cliente.
 */
export type RoomStatusClient = "waiting" | "in-game" | "closed";

/**
 * Información básica de una sala para mostrar en listados.
 */
export interface RoomInfo {
    id: string;
    name: string;
    playerCount: number;
    maxPlayers: number;
    hostUsername?: string;
    status?: RoomStatusClient;
}

/**
 * Payload recibido al crear o unirse exitosamente a una sala.
 */
export interface RoomJoinSuccessPayload {
    roomId: string;
    name: string;
    // Puedes agregar aquí la lista de jugadores si el backend la envía
    // players?: PlayerDataFromServer[];
}

/**
 * Representa un objeto del catálogo disponible para colocar en una sala.
 */
export interface CatalogItemClient {
    id: string;
    name: string;
    description?: string;
    assetKey: string;
    price: number;
    category: string;
    dimensionsGrid?: { width: number; height: number };
    isPlaceableInRoom: boolean;
    // Otros campos opcionales según necesidades del cliente
}

/**
 * Representa un objeto colocado en una sala.
 */
export interface RoomPlacedItemClient {
    id: string;
    roomId: string;
    catalogItemId: string;
    catalogItem: CatalogItemClient;
    placedByUserId: string;
    x: number;
    y: number;
    rotation?: number;
    zIndex?: number;
    instanceProperties?: any;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

/**
 * Información detallada de una sala, incluyendo el host.
 */
export interface RoomDetailsClient {
    id: string;
    name: string;
    hostUserId: string;
    // Agrega otros campos relevantes de la entidad Room si es necesario
}