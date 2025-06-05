/**
 * Definiciones y tipos para el sistema de logros (achievements).
 * 
 * Este módulo define los tipos de criterios y recompensas posibles para los logros,
 * así como la estructura de un logro y una lista de logros predefinidos.
 */

/**
 * Tipos de criterios que pueden activar un logro.
 */
export enum AchievementCriteriaType {
    ITEM_PURCHASE_COUNT = 'item_purchase_count',         // Cantidad de compras realizadas
    SPECIFIC_ITEM_PURCHASED = 'specific_item_purchased', // Compra de un ítem específico
    // Se pueden agregar más tipos según necesidades futuras (ej: LOGIN_STREAK, ROOMS_VISITED)
}

/**
 * Tipos de recompensas que puede otorgar un logro.
 */
export enum AchievementRewardType {
    CREDITS = 'credits',
    ITEM = 'item',       
}

/**
 * Estructura que define un logro.
 */
export interface AchievementDefinition {
    id: string;                        // Identificador único del logro (ej: 'BUY_2_ITEMS')
    name: string;                      // Nombre visible del logro
    description: string;               // Descripción del logro
    criteriaType: AchievementCriteriaType; // Tipo de criterio para obtener el logro
    criteriaThreshold?: number;        // Umbral numérico para cumplir el criterio (ej: cantidad de compras)
    criteriaTargetId?: string;         // ID objetivo para criterios específicos (ej: ID de un ítem)
    rewardType: AchievementRewardType; // Tipo de recompensa otorgada
    rewardValue?: number;              // Valor de la recompensa (ej: cantidad de créditos o ítems)
    rewardCatalogItemId?: string;      // ID del ítem de recompensa (si aplica)
    iconUrl?: string;                  // URL del icono representativo del logro
    isActive?: boolean;                // Indica si el logro está activo (por defecto true)
}

/**
 * Lista de logros predefinidos disponibles en el sistema.
 */
export const PREDEFINED_ACHIEVEMENTS: AchievementDefinition[] = [
    {
        id: 'BUY_2_ITEMS',
        name: 'Comprador Entusiasta',
        description: 'Realiza 2 compras en la tienda.',
        criteriaType: AchievementCriteriaType.ITEM_PURCHASE_COUNT,
        criteriaThreshold: 2,
        rewardType: AchievementRewardType.CREDITS,
        rewardValue: 100,
        iconUrl: '/assets/achievements/buyer_enthusiast.png',
    },
];