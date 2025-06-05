import AppDataSource from '../../config/data-source';
import { User } from '../auth/entities/User.entity';
import { Friendship, FriendshipStatus } from './entities/Friendship.entity';
import { Repository, Not } from 'typeorm';

/**
 * Servicio para gestionar las relaciones de amistad entre usuarios.
 * Permite enviar solicitudes de amistad, responderlas, eliminar amigos,
 * obtener la lista de amigos y solicitudes pendientes.
 */
export class FriendshipService {
    private userRepository: Repository<User>;
    private friendshipRepository: Repository<Friendship>;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
        this.friendshipRepository = AppDataSource.getRepository(Friendship);
    }

    /**
     * Ordena dos IDs de usuario de forma ascendente.
     * Esto garantiza que la relación de amistad sea única entre dos usuarios,
     * independientemente del orden en que se envíe la solicitud.
     * @param id1 Primer ID de usuario
     * @param id2 Segundo ID de usuario
     * @returns Objeto con los IDs ordenados
     */
    private getOrderedUserIds(id1: string, id2: string): { u1Id: string, u2Id: string } {
        return id1 < id2 ? { u1Id: id1, u2Id: id2 } : { u1Id: id2, u2Id: id1 };
    }

    /**
     * Envía una solicitud de amistad de un usuario a otro.
     * Valida que ambos usuarios existan, que no se envíe a sí mismo,
     * y que no exista ya una relación de amistad o solicitud pendiente.
     * @param senderUserId ID del usuario que envía la solicitud
     * @param receiverUsername Nombre de usuario del destinatario
     * @returns Resultado de la operación, incluyendo la amistad creada si es exitosa
     */
    async sendFriendRequest(senderUserId: string, receiverUsername: string): Promise<{ success: boolean; message?: string; friendship?: Friendship }> {
        const sender = await this.userRepository.findOneBy({ id: senderUserId });
        if (!sender) return { success: false, message: 'Usuario remitente no encontrado.' };

        const receiver = await this.userRepository.findOneBy({ username: receiverUsername });
        if (!receiver) return { success: false, message: `Usuario '${receiverUsername}' no encontrado.` };

        if (senderUserId === receiver.id) return { success: false, message: 'No puedes agregarte a ti mismo como amigo.' };

        const { u1Id, u2Id } = this.getOrderedUserIds(senderUserId, receiver.id);

        const existingFriendship = await this.friendshipRepository.findOneBy([
            { userId1: u1Id, userId2: u2Id }
        ]);

        if (existingFriendship) {
            if (existingFriendship.status === FriendshipStatus.ACCEPTED) return { success: false, message: `Ya eres amigo de ${receiverUsername}.` };
            if (existingFriendship.status === FriendshipStatus.PENDING) return { success: false, message: `Ya existe una solicitud pendiente con ${receiverUsername}.` };
            if (existingFriendship.status === FriendshipStatus.BLOCKED) return { success: false, message: `No puedes enviar una solicitud a ${receiverUsername} en este momento.` };
        }
        
        const newFriendship = this.friendshipRepository.create({
            userId1: u1Id,
            userId2: u2Id,
            requestedByUserId: senderUserId,
            status: FriendshipStatus.PENDING,
        });

        try {
            await this.friendshipRepository.save(newFriendship);
            console.log(`FriendshipService: ${sender.username} envió solicitud a ${receiver.username}`);
            return { success: true, message: `Solicitud de amistad enviada a ${receiverUsername}.`, friendship: newFriendship };
        } catch (error) {
            console.error("Error al guardar la solicitud de amistad:", error);
            return { success: false, message: 'Error al procesar la solicitud.' };
        }
    }

    /**
     * Permite a un usuario responder a una solicitud de amistad recibida.
     * Solo el destinatario puede aceptar o rechazar la solicitud.
     * @param respondingUserId ID del usuario que responde
     * @param friendshipId ID de la relación de amistad
     * @param action Acción a realizar: 'accept' para aceptar, 'decline' para rechazar
     * @returns Resultado de la operación y la amistad actualizada si es exitosa
     */
    async respondToFriendRequest(
        respondingUserId: string, 
        friendshipId: string, 
        action: 'accept' | 'decline'
    ): Promise<{ success: boolean; message?: string; friendship?: Friendship }> {
        const friendship = await this.friendshipRepository.findOne({
            where: { id: friendshipId },
            relations: ['user1', 'user2', 'requestedBy']
        });

        if (!friendship) return { success: false, message: 'Solicitud no encontrada.' };
        if (friendship.status !== FriendshipStatus.PENDING) return { success: false, message: 'Esta solicitud ya ha sido respondida o no es válida.'};
        if (friendship.requestedByUserId === respondingUserId) {
            return { success: false, message: 'No puedes responder a tu propia solicitud.' };
        }
        if (friendship.userId1 !== respondingUserId && friendship.userId2 !== respondingUserId) {
            return { success: false, message: 'No estás autorizado para responder a esta solicitud.' };
        }

        if (action === 'accept') {
            friendship.status = FriendshipStatus.ACCEPTED;
        } else if (action === 'decline') {
            friendship.status = FriendshipStatus.DECLINED; 
        } else {
            return { success: false, message: 'Acción no válida.' };
        }

        try {
            await this.friendshipRepository.save(friendship);
            const message = action === 'accept' ? 'Amistad aceptada.' : 'Solicitud rechazada.';
            console.log(`FriendshipService: Solicitud ${friendshipId} ${action === 'accept' ? 'aceptada' : 'rechazada'} por ${respondingUserId}`);
            return { success: true, message, friendship };
        } catch (error) {
            console.error("Error al responder a la solicitud de amistad:", error);
            return { success: false, message: 'Error al procesar la respuesta.' };
        }
    }

    /**
     * Elimina una amistad existente entre dos usuarios.
     * Solo se puede eliminar si la relación está aceptada.
     * @param userId ID del usuario que elimina
     * @param friendToRemoveId ID del amigo a eliminar
     * @returns Resultado de la operación
     */
    async removeFriend(userId: string, friendToRemoveId: string): Promise<{ success: boolean; message?: string }> {
        const { u1Id, u2Id } = this.getOrderedUserIds(userId, friendToRemoveId);

        const friendship = await this.friendshipRepository.findOneBy({
            userId1: u1Id,
            userId2: u2Id,
            status: FriendshipStatus.ACCEPTED
        });

        if (!friendship) return { success: false, message: 'No se encontró la amistad o ya fue eliminada.' };

        try {
            await this.friendshipRepository.remove(friendship);
            console.log(`FriendshipService: Amistad entre ${userId} y ${friendToRemoveId} eliminada.`);
            return { success: true, message: 'Amigo eliminado correctamente.' };
        } catch (error) {
            console.error("Error al eliminar amigo:", error);
            return { success: false, message: 'Error al eliminar amigo.' };
        }
    }

    /**
     * Obtiene la lista de amigos de un usuario.
     * Solo se incluyen relaciones con estado 'ACEPTADO'.
     * @param userId ID del usuario
     * @returns Lista de amigos con sus datos básicos
     */
    async getFriends(userId: string): Promise<{ id: string; username: string; }[]> {
        const friendships = await this.friendshipRepository.find({
            where: [
                { userId1: userId, status: FriendshipStatus.ACCEPTED },
                { userId2: userId, status: FriendshipStatus.ACCEPTED }
            ],
            relations: ['user1', 'user2']
        });

        return friendships.map(friendship => {
            const friendUser = friendship.userId1 === userId ? friendship.user2 : friendship.user1;
            return {
                id: friendUser.id,
                username: friendUser.username,
            };
        });
    }

    /**
     * Obtiene las solicitudes de amistad pendientes de un usuario.
     * Incluye tanto las enviadas como las recibidas.
     * @param userId ID del usuario
     * @returns Objeto con listas de solicitudes enviadas y recibidas
     */
    async getPendingRequests(userId: string): Promise<{ sent: Friendship[]; received: Friendship[] }> {
        const sent = await this.friendshipRepository.find({
            where: { requestedByUserId: userId, status: FriendshipStatus.PENDING },
            relations: ['user1', 'user2']
        });

        const received = await this.friendshipRepository.find({
            where: [
                { userId1: userId, status: FriendshipStatus.PENDING, requestedByUserId: Not(userId) },
                { userId2: userId, status: FriendshipStatus.PENDING, requestedByUserId: Not(userId) }
            ],
            relations: ['user1', 'user2', 'requestedBy']
        });

        return { sent, received };
    }
}