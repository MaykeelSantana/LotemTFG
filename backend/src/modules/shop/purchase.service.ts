import { CurrencyService } from '../currency/currency.service';
import { CatalogService } from '../catalog/catalog.service';
import { InventoryService } from '../inventory/inventory.service';
import { PlayerInventoryItem } from '../inventory/entities/PlayerInventoryItem.entity';

/**
 * Servicio encargado de gestionar la compra de objetos del catálogo por parte de un usuario.
 * Se encarga de validar la existencia del objeto, deducir la moneda correspondiente,
 * añadir el objeto al inventario del usuario y manejar posibles errores y reembolsos.
 */
export class PurchaseService {
    private currencyService: CurrencyService;
    private catalogService: CatalogService;
    private inventoryService: InventoryService;

    /**
     * Inicializa las dependencias necesarias para el proceso de compra.
     * En un framework como NestJS, estos servicios deberían ser inyectados.
     */
    constructor() {
        this.currencyService = new CurrencyService();
        this.catalogService = new CatalogService();
        this.inventoryService = new InventoryService();
    }

    /**
     * Realiza la compra de un objeto del catálogo para un usuario.
     * 
     * @param userId - ID del usuario que realiza la compra.
     * @param catalogItemId - ID del objeto en el catálogo que se desea comprar.
     * @returns Un objeto con el resultado de la operación, mensaje descriptivo,
     *          el objeto añadido al inventario (si aplica) y el nuevo saldo del usuario.
     * 
     * Proceso:
     * 1. Verifica que el objeto exista en el catálogo.
     * 2. Intenta deducir la cantidad de moneda necesaria del usuario.
     * 3. Si la deducción es exitosa, intenta añadir el objeto al inventario del usuario.
     * 4. Si falla al añadir al inventario, reembolsa la moneda deducida.
     * 5. Devuelve el resultado de la operación.
     */
    async buyItem(
        userId: string,
        catalogItemId: string
    ): Promise<{
        success: boolean;
        message?: string;
        inventoryItem?: PlayerInventoryItem;
        newBalance?: number;
    }> {
        const itemToBuy = await this.catalogService.findItemById(catalogItemId);
        if (!itemToBuy) {
            return { success: false, message: 'El objeto no existe en el catálogo.' };
        }

        const deductionResult = await this.currencyService.deductCurrency(userId, itemToBuy.price);
        if (!deductionResult.success) {
            return { success: false, message: deductionResult.error || 'Error al deducir saldo.' };
        }

        const addToInventoryResult = await this.inventoryService.addItemToInventory(userId, catalogItemId, 1);
        if ('error' in addToInventoryResult) {
            await this.currencyService.addCurrency(userId, itemToBuy.price);
            return { success: false, message: addToInventoryResult.error || 'Error al añadir el objeto al inventario.' };
        }

        return {
            success: true,
            message: '¡Compra exitosa!',
            inventoryItem: addToInventoryResult,
            newBalance: deductionResult.newBalance
        };
    }
}