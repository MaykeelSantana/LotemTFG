import AppDataSource from '../../config/data-source';
import { Room } from './entities/Room.entity';
import { RoomPlacedItem } from './entities/RoomPlacedItem.entity';
import { InventoryService } from '../inventory/inventory.service';

/**
 * Servicio para gestionar la decoración de salas.
 * Permite colocar, mover, obtener y eliminar objetos decorativos en una sala.
 */
export class RoomDecorationService {
    private roomRepository = AppDataSource.getRepository(Room);
    private roomPlacedItemRepository = AppDataSource.getRepository(RoomPlacedItem);
    private inventoryService: InventoryService;

    constructor() {
        this.inventoryService = new InventoryService();
    }

    /**
     * Verifica si el usuario es el host de la sala.
     * @param userId ID del usuario.
     * @param roomId ID de la sala.
     * @returns true si el usuario es el host, false en caso contrario.
     */
    private async isUserRoomHost(userId: string, roomId: string): Promise<boolean> {
        const room = await this.roomRepository.findOne({ where: { id: roomId, hostUserId: userId } });
        return !!room;
    }

    /**
     * Obtiene todos los objetos colocados en una sala.
     * @param roomId ID de la sala.
     * @returns Lista de objetos colocados en la sala.
     */
    async getPlacedItemsInRoom(roomId: string): Promise<RoomPlacedItem[]> {
        return this.roomPlacedItemRepository.find({
            where: { roomId },
            relations: ['catalogItem'],
            order: { createdAt: 'ASC' }
        });
    }

    /**
     * Coloca un objeto del inventario del usuario en la sala.
     * Solo el host de la sala puede realizar esta acción.
     * @param userId ID del usuario.
     * @param roomId ID de la sala.
     * @param playerInventoryItemId ID del objeto en el inventario del usuario.
     * @param x Posición X en la sala.
     * @param y Posición Y en la sala.
     * @param rotation Rotación del objeto (opcional).
     * @param zIndex Índice de profundidad (opcional).
     * @returns El objeto colocado o un error.
     */
    async placeItem(
        userId: string, 
        roomId: string, 
        playerInventoryItemId: string, 
        x: number, 
        y: number, 
        rotation?: number,
        zIndex?: number
    ): Promise<RoomPlacedItem | { error: string }> {
        if (!await this.isUserRoomHost(userId, roomId)) {
            return { error: 'Solo el host de la sala puede colocar objetos.' };
        }

        const inventoryItem = await this.inventoryService.findInventoryItemById(playerInventoryItemId);
        if (!inventoryItem || inventoryItem.userId !== userId) {
            return { error: 'Objeto de inventario no válido o no pertenece al usuario.' };
        }
        if (!inventoryItem.catalogItem.isPlaceableInRoom) {
            return { error: 'Este objeto no se puede colocar en la sala.' };
        }
        // Aquí se podría agregar lógica de validación de posición (colisiones, límites, etc.)

        const newPlacedItem = this.roomPlacedItemRepository.create({
            roomId,
            catalogItemId: inventoryItem.catalogItemId,
            placedByUserId: userId,
            x,
            y,
            rotation: rotation || 0,
            zIndex: zIndex,
        });
        await this.roomPlacedItemRepository.save(newPlacedItem);
        
        // Elimina el objeto del inventario del usuario
        const consumed = await this.inventoryService.removeItemFromInventory(playerInventoryItemId, 1);
        if (consumed !== true) {
            await this.roomPlacedItemRepository.remove(newPlacedItem);
            return { error: 'Error al actualizar el inventario después de colocar el objeto.'};
        }

        return this.roomPlacedItemRepository.findOne({where: {id: newPlacedItem.id}, relations: ['catalogItem']}) as Promise<RoomPlacedItem>;
    }

    /**
     * Mueve un objeto ya colocado en la sala a una nueva posición.
     * Solo el host de la sala puede realizar esta acción.
     * @param userId ID del usuario.
     * @param roomId ID de la sala.
     * @param roomPlacedItemId ID del objeto colocado en la sala.
     * @param newX Nueva posición X.
     * @param newY Nueva posición Y.
     * @param newRotation Nueva rotación (opcional).
     * @param newZIndex Nuevo índice de profundidad (opcional).
     * @returns El objeto movido o un error.
     */
    async moveItem(
        userId: string, 
        roomId: string, 
        roomPlacedItemId: string, 
        newX: number, 
        newY: number, 
        newRotation?: number,
        newZIndex?: number
    ): Promise<RoomPlacedItem | { error: string }> {
        if (!await this.isUserRoomHost(userId, roomId)) {
            return { error: 'Solo el host de la sala puede mover objetos.' };
        }

        const itemToMove = await this.roomPlacedItemRepository.findOneBy({ id: roomPlacedItemId, roomId });
        if (!itemToMove) {
            return { error: 'Objeto no encontrado en esta sala.' };
        }

        // Aquí se podría agregar lógica de validación de la nueva posición
        
        itemToMove.x = newX;
        itemToMove.y = newY;
        if (newRotation !== undefined) itemToMove.rotation = newRotation;
        if (newZIndex !== undefined) itemToMove.zIndex = newZIndex;
        
        await this.roomPlacedItemRepository.save(itemToMove);
        return this.roomPlacedItemRepository.findOne({where: {id: itemToMove.id}, relations: ['catalogItem']}) as Promise<RoomPlacedItem>;
    }

    /**
     * Elimina un objeto colocado en la sala.
     * Solo el host de la sala puede realizar esta acción.
     * @param userId ID del usuario.
     * @param roomId ID de la sala.
     * @param roomPlacedItemId ID del objeto colocado en la sala.
     * @returns Resultado de la operación, indicando éxito o error.
     */
    async removeItem(
        userId: string, 
        roomId: string, 
        roomPlacedItemId: string
    ): Promise<{ success: boolean; message?: string, returnedToInventory?: boolean }> {
        if (!await this.isUserRoomHost(userId, roomId)) {
            return { success: false, message: 'Solo el host de la sala puede eliminar objetos.' };
        }

        const itemToRemove = await this.roomPlacedItemRepository.findOne({ where: { id: roomPlacedItemId, roomId }, relations: ['catalogItem'] });
        if (!itemToRemove) {
            return { success: false, message: 'Objeto no encontrado en esta sala.' };
        }

        await this.roomPlacedItemRepository.remove(itemToRemove);

        // Si se desea, aquí se podría devolver el objeto al inventario del usuario que lo colocó.

        return { success: true, message: 'Objeto eliminado de la sala.' };
    }
}