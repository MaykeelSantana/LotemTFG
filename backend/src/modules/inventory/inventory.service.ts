import AppDataSource from '../../config/data-source';
import { PlayerInventoryItem } from './entities/PlayerInventoryItem.entity';
import { User } from '../auth/entities/User.entity';
import { CatalogItem } from '../catalog/entities/CatalogItem.entity';
import { Repository } from 'typeorm';

/**
 * Servicio para la gestión del inventario de los jugadores.
 * Permite consultar, agregar y eliminar ítems del inventario de un usuario.
 */
export class InventoryService {
    private inventoryRepository: Repository<PlayerInventoryItem>;
    private userRepository: Repository<User>;
    private catalogItemRepository: Repository<CatalogItem>;

    /**
     * Inicializa los repositorios necesarios para la gestión del inventario.
     */
    constructor() {
        this.inventoryRepository = AppDataSource.getRepository(PlayerInventoryItem);
        this.userRepository = AppDataSource.getRepository(User);
        this.catalogItemRepository = AppDataSource.getRepository(CatalogItem);
    }

    /**
     * Obtiene el inventario completo de un usuario, ordenado por fecha de adquisición descendente.
     * @param userId ID del usuario.
     * @returns Lista de objetos PlayerInventoryItem pertenecientes al usuario.
     */
    async getUserInventory(userId: string): Promise<PlayerInventoryItem[]> {
        return this.inventoryRepository.find({
            where: { userId },
            relations: ['catalogItem'],
            order: { acquiredAt: 'DESC' }
        });
    }

    /**
     * Busca un ítem específico del inventario por su ID.
     * @param playerInventoryItemId ID del ítem en el inventario.
     * @returns El objeto PlayerInventoryItem encontrado o null si no existe.
     */
    async findInventoryItemById(playerInventoryItemId: string): Promise<PlayerInventoryItem | null> {
        return this.inventoryRepository.findOne({
            where: { id: playerInventoryItemId },
            relations: ['catalogItem', 'user']
        });
    }

    /**
     * Agrega un ítem al inventario de un usuario. Si el ítem es acumulable (stackable) y ya existe,
     * incrementa la cantidad. Si no existe, crea una nueva entrada.
     * @param userId ID del usuario.
     * @param catalogItemId ID del ítem de catálogo a agregar.
     * @param quantityToAdd Cantidad a agregar (por defecto 1).
     * @returns El objeto PlayerInventoryItem actualizado o creado, o un error en caso de fallo.
     */
    async addItemToInventory(
        userId: string, 
        catalogItemId: string, 
        quantityToAdd: number = 1
    ): Promise<PlayerInventoryItem | { error: string }> {

        if (quantityToAdd <= 0) {
            return { error: "La cantidad a añadir debe ser positiva." };
        }

        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            return { error: 'Usuario no encontrado.' };
        }

        const catalogItem = await this.catalogItemRepository.findOneBy({ id: catalogItemId });
        if (!catalogItem) {
            return { error: 'Objeto del catálogo no encontrado.' };
        }

        let inventoryItemToSave: PlayerInventoryItem;
        let existingInventoryItem: PlayerInventoryItem | null = null;

        // Si el ítem es acumulable, busca si ya existe en el inventario del usuario
        if (catalogItem.isStackableInInventory) { 
            existingInventoryItem = await this.inventoryRepository.findOne({
                where: {
                    userId: userId,
                    catalogItemId: catalogItemId,
                }
            });
        }

        if (existingInventoryItem) {
            // Incrementa la cantidad si ya existe
            existingInventoryItem.quantity += quantityToAdd;
            inventoryItemToSave = existingInventoryItem;
        } else {
            // Crea una nueva entrada si no existe
            inventoryItemToSave = this.inventoryRepository.create({
                userId,
                catalogItemId,
                quantity: quantityToAdd,
            });
        }

        try {
            const savedItem = await this.inventoryRepository.save(inventoryItemToSave);
            // Recarga el ítem guardado con la relación catalogItem
            const reloadedItem = await this.inventoryRepository.findOne({
                where: { id: savedItem.id },
                relations: ['catalogItem']
            });
            return reloadedItem || savedItem;
        } catch (dbError: any) {
            return { error: "Error al guardar el ítem en el inventario: " + dbError.message };
        }
    }

    /**
     * Elimina una cantidad específica de un ítem del inventario.
     * Si la cantidad a eliminar es igual a la cantidad existente, elimina la entrada completa.
     * Si es menor, solo decrementa la cantidad.
     * @param playerInventoryItemId ID del ítem en el inventario.
     * @param quantityToRemove Cantidad a eliminar (por defecto 1).
     * @returns true si la operación fue exitosa, o un error en caso contrario.
     */
    async removeItemFromInventory(playerInventoryItemId: string, quantityToRemove: number = 1): Promise<boolean | { error: string }> {
        const inventoryItem = await this.inventoryRepository.findOneBy({ id: playerInventoryItemId });
        if (!inventoryItem) return { error: 'Objeto de inventario no encontrado.' };

        if (inventoryItem.quantity < quantityToRemove) {
             return { error: 'Cantidad insuficiente en el inventario.' };
        }

        if (inventoryItem.quantity === quantityToRemove) {
            await this.inventoryRepository.remove(inventoryItem);
        } else {
            inventoryItem.quantity -= quantityToRemove;
            await this.inventoryRepository.save(inventoryItem);
        }
        return true;
    }
}