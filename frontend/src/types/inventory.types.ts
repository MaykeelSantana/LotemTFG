import { type CatalogItemClient } from '../components/game/CatalogPanel';

/**
 * Representa un objeto del inventario de un jugador en el cliente.
 */
export interface PlayerInventoryItemClient {
    /** Identificador único del objeto en el inventario del jugador */
    id: string;
    /** Identificador del usuario propietario */
    userId: string;
    /** Identificador del objeto en el catálogo */
    catalogItemId: string;
    /** Detalles del objeto del catálogo */
    catalogItem: CatalogItemClient;
    /** Cantidad de este objeto que posee el jugador */
    quantity: number;
    /** Fecha en la que se adquirió el objeto */
    acquiredAt: string;
}