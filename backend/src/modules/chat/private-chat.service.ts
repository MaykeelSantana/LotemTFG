import AppDataSource from '../../config/data-source';
import { User } from '../auth/entities/User.entity';
import { Friendship, FriendshipStatus } from '../friends/entities/Friendship.entity';
import { PrivateChatMessage } from './entities/PrivateChatMessage.entity';
import { Repository, LessThan } from 'typeorm';

/**
 * Servicio para gestionar el chat privado entre usuarios.
 * Permite enviar mensajes, obtener historial, marcar mensajes como leídos y obtener resúmenes de mensajes no leídos.
 */
export class PrivateChatService {
    private userRepository: Repository<User>;
    private friendshipRepository: Repository<Friendship>;
    private privateChatMessageRepository: Repository<PrivateChatMessage>;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
        this.friendshipRepository = AppDataSource.getRepository(Friendship);
        this.privateChatMessageRepository = AppDataSource.getRepository(PrivateChatMessage);
    }

    /**
     * Ordena dos IDs de usuario para mantener consistencia en la relación de amistad.
     * @param id1 Primer ID de usuario
     * @param id2 Segundo ID de usuario
     * @returns Objeto con los IDs ordenados
     */
    private getOrderedUserIds(id1: string, id2: string): { u1Id: string, u2Id: string } {
        return id1 < id2 ? { u1Id: id1, u2Id: id2 } : { u1Id: id2, u2Id: id1 };
    }

    /**
     * Obtiene la entidad de amistad aceptada entre dos usuarios.
     * @param userId1 ID del primer usuario
     * @param userId2 ID del segundo usuario
     * @returns Entidad de amistad o null si no existe
     */
    private async getFriendshipEntity(userId1: string, userId2: string): Promise<Friendship | null> {
        const { u1Id, u2Id } = this.getOrderedUserIds(userId1, userId2);
        return this.friendshipRepository.findOne({
            where: { userId1: u1Id, userId2: u2Id, status: FriendshipStatus.ACCEPTED }
        });
    }

    /**
     * Envía un mensaje privado entre dos usuarios que son amigos.
     * @param senderUserId ID del usuario remitente
     * @param receiverUserId ID del usuario receptor
     * @param messageText Texto del mensaje (puede ser null si es imagen)
     * @param messageType Tipo de mensaje ('text' o 'image')
     * @param imageUrl URL de la imagen (si es mensaje de imagen)
     * @returns Resultado de la operación con el mensaje guardado o error
     */
    async sendMessage(
        senderUserId: string, 
        receiverUserId: string, 
        messageText: string | null,
        messageType: 'text' | 'image',
        imageUrl: string | null
    ): Promise<{ success: boolean; message?: PrivateChatMessage; error?: string }> {
        if (messageType === 'text' && (messageText === null || messageText.trim() === '')) {
            return { success: false, error: "El mensaje de texto no puede estar vacío." };
        }
        if (messageType === 'image' && !imageUrl) {
            return { success: false, error: "La URL de la imagen es requerida para mensajes de imagen." };
        }

        const friendship = await this.getFriendshipEntity(senderUserId, receiverUserId);
        if (!friendship) {
            return { success: false, error: "No sois amigos o la amistad no está activa para chatear." };
        }

        const sender = await this.userRepository.findOneBy({ id: senderUserId });
        if (!sender) {
            return { success: false, error: "Usuario remitente no encontrado." };
        }

        const newMessage = this.privateChatMessageRepository.create({
            friendshipId: friendship.id,
            senderId: sender.id,
            senderUsername: sender.username,
            receiverId: receiverUserId,
            messageText: messageText ?? undefined,
            messageType,
            imageUrl: imageUrl ?? undefined,
            isRead: false,
            timestamp: new Date(),
        });

        try {
            const savedMessage = await this.privateChatMessageRepository.save(newMessage);
            return { success: true, message: savedMessage };
        } catch (error) {
            console.error("Error guardando mensaje privado en servicio:", error);
            return { success: false, error: "Error al enviar el mensaje." };
        }
    }

    /**
     * Obtiene el historial de mensajes privados entre dos usuarios.
     * Permite paginación usando un timestamp para cargar mensajes más antiguos.
     * @param requestingUserId ID del usuario que solicita el historial
     * @param chatPartnerUserId ID del usuario con quien se chatea
     * @param limit Cantidad máxima de mensajes a devolver (por defecto 30)
     * @param beforeTimestamp Timestamp para paginar mensajes anteriores a esa fecha
     * @returns Mensajes encontrados, indicador si hay más mensajes y posibles errores
     */
    async getChatHistory(
        requestingUserId: string,
        chatPartnerUserId: string,
        limit: number = 30,
        beforeTimestamp?: string
    ): Promise<{ success: boolean; messages?: PrivateChatMessage[]; error?: string; hasMore?: boolean }> {
        const friendship = await this.getFriendshipEntity(requestingUserId, chatPartnerUserId);
        if (!friendship) {
            return { success: false, error: "Amistad no encontrada." };
        }

        try {
            const queryOptions: any = {
                where: { friendshipId: friendship.id },
                order: { timestamp: 'DESC' },
                take: limit + 1,
            };

            if (beforeTimestamp) {
                queryOptions.where.timestamp = LessThan(new Date(beforeTimestamp));
            }
            
            const messagesFound = await this.privateChatMessageRepository.find(queryOptions);
            
            let hasMore = false;
            if (messagesFound.length > limit) {
                hasMore = true;
                messagesFound.pop();
            }

            const messagesInAscOrder = messagesFound.reverse(); 
            return { success: true, messages: messagesInAscOrder, hasMore };
        } catch (error) {
            console.error("Error obteniendo historial de chat:", error);
            return { success: false, error: "Error al obtener el historial." };
        }
    }

    /**
     * Marca como leídos todos los mensajes no leídos enviados por el usuario amigo.
     * @param readingUserId ID del usuario que lee los mensajes
     * @param chatPartnerUserId ID del usuario que envió los mensajes
     * @returns Cantidad de mensajes actualizados o error
     */
    async markMessagesAsRead(readingUserId: string, chatPartnerUserId: string): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
        const friendship = await this.getFriendshipEntity(readingUserId, chatPartnerUserId);
        if (!friendship) {
            return { success: false, error: "Amistad no encontrada para marcar mensajes." };
        }

        try {
            const result = await this.privateChatMessageRepository.update(
                {
                    friendshipId: friendship.id,
                    receiverId: readingUserId,
                    senderId: chatPartnerUserId,
                    isRead: false
                },
                { isRead: true }
            );
            console.log(`PrivateChatService: Marcados ${result.affected || 0} mensajes como leídos de ${chatPartnerUserId} para ${readingUserId}`);
            return { success: true, updatedCount: result.affected || 0 };
        } catch (error) {
            console.error("Error marcando mensajes como leídos:", error);
            return { success: false, error: "Error al actualizar estado de mensajes." };
        }
    }

    /**
     * Obtiene un resumen de mensajes no leídos por cada amigo.
     * Devuelve la cantidad y el timestamp del último mensaje no leído por cada chat.
     * @param userId ID del usuario que consulta
     * @returns Objeto con el resumen de mensajes no leídos por usuario amigo
     */
    async getUnreadMessageSummary(userId: string): Promise<Record<string, { count: number; lastMessageTimestamp?: Date }>> {
        const summary: Record<string, { count: number; lastMessageTimestamp?: Date }> = {};
        const friendships = await this.friendshipRepository.find({
            where: [
                { userId1: userId, status: FriendshipStatus.ACCEPTED },
                { userId2: userId, status: FriendshipStatus.ACCEPTED }
            ],
        });

        for (const fs of friendships) {
            const chatPartnerId = fs.userId1 === userId ? fs.userId2 : fs.userId1;
            const unreadMessages = await this.privateChatMessageRepository.find({
                where: {
                    friendshipId: fs.id,
                    receiverId: userId,
                    senderId: chatPartnerId,
                    isRead: false
                },
                order: { timestamp: 'DESC' }
            });
            if (unreadMessages.length > 0) {
                summary[chatPartnerId] = {
                    count: unreadMessages.length,
                    lastMessageTimestamp: unreadMessages[0].timestamp,
                };
            }
        }
        return summary;
    }
}