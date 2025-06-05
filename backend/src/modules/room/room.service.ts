import AppDataSource from '../../config/data-source';
import { PlayerCharacter } from '../character/entities/PlayerCharacter.entity';
import { Room, RoomStatus } from './entities/Room.entity';
import { LessThanOrEqual, MoreThan, Not, IsNull } from 'typeorm';

/**
 * Servicio para la gestión de salas (Room) y personajes (PlayerCharacter).
 * Permite crear, unir, abandonar salas, gestionar el estado de las salas y la apariencia de los personajes.
 */
export class RoomService {
    private roomRepository = AppDataSource.getRepository(Room);
    private characterRepository = AppDataSource.getRepository(PlayerCharacter);

    /**
     * Crea una nueva sala.
     * @param name Nombre de la sala.
     * @param hostUserId ID del usuario anfitrión.
     * @param maxPlayers Número máximo de jugadores (por defecto 4).
     * @returns La sala creada.
     */
    async createRoom(name: string, hostUserId: string, maxPlayers: number = 4): Promise<Room> {
        const newRoom = this.roomRepository.create({
            name,
            hostUserId,
            maxPlayers,
            status: 'waiting',
        });
        await this.roomRepository.save(newRoom);
        console.log(`RoomService: Sala creada - ID: ${newRoom.id}, Nombre: ${name}, Host: ${hostUserId}`);
        return newRoom;
    }

    /**
     * Permite a un personaje unirse a una sala.
     * Gestiona el estado de la sala y verifica restricciones como capacidad y pertenencia previa.
     * @param roomId ID de la sala.
     * @param characterId ID del personaje.
     * @returns Objeto con la sala y el personaje actualizado, o un error.
     */
    public async joinRoom(roomId: string, characterId: string): Promise<{ room: Room; character: PlayerCharacter } | { error: string }> {
        const room = await this.roomRepository.findOne({ 
            where: { id: roomId }, 
            relations: ['playerCharacters', 'host'] 
        });

        if (!room) {
            return { error: 'Sala no encontrada.' };
        }

        let wasRoomStatusChanged = false;

        if (room.status === 'closed') {
            if ((room.playerCharacters?.length || 0) === 0) {
                room.status = 'waiting';
                wasRoomStatusChanged = true;
            } else {
                return { error: "La sala está cerrada y no se puede unir." };
            }
        }

        const playerCount = room.playerCharacters?.length || 0;
        if (!wasRoomStatusChanged && playerCount >= room.maxPlayers) {
            return { error: 'La sala está llena.' };
        }

        const character = await this.characterRepository.findOneBy({ id: characterId });
        if (!character) {
            return { error: 'Personaje no encontrado.' };
        }

        if (character.currentRoomId === roomId) {
            if (wasRoomStatusChanged) {
                await this.roomRepository.save(room);
            }
            const charWithRoom = await this.characterRepository.findOne({where: {id: characterId}, relations: ['currentRoom']});
            const reloadedRoom = await this.roomRepository.findOneOrFail({ where: { id: roomId }, relations: ['playerCharacters', 'playerCharacters.user', 'host'] });
            return { room: reloadedRoom, character: charWithRoom || character };
        }
        if (character.currentRoomId && character.currentRoomId !== roomId) {
            return { error: 'El personaje ya está en otra sala. Debe salir primero.'};
        }

        character.currentRoomId = roomId;
        character.currentRoom = room;

        if (wasRoomStatusChanged) {
            await this.roomRepository.save(room);
        }
        
        await this.characterRepository.save(character);

        const finalRoomState = await this.roomRepository.findOneOrFail({ 
            where: { id: roomId }, 
            relations: ['playerCharacters', 'playerCharacters.user', 'host'] 
        });
        
        console.log(`RoomService: Personaje ${characterId} unido a sala ${roomId}. Jugadores: ${finalRoomState.playerCharacters.length}/${finalRoomState.maxPlayers}. Estado sala: ${finalRoomState.status}`);
        return { room: finalRoomState, character };
    }

    /**
     * Permite a un personaje abandonar la sala en la que se encuentra.
     * Si la sala queda vacía, se marca como cerrada.
     * @param characterId ID del personaje.
     * @returns El personaje actualizado o null si no estaba en ninguna sala.
     */
    async leaveRoom(characterId: string): Promise<PlayerCharacter | null> {
        const character = await this.characterRepository.findOne({ where: { id: characterId }, relations: ['currentRoom'] });
        if (!character || !character.currentRoomId) {
            console.log(`RoomService: Personaje ${characterId} no está en ninguna sala o no encontrado.`);
            return null; 
        }
        
        const oldRoomId = character.currentRoomId;
        const oldRoom = character.currentRoom;

        character.currentRoomId = null;
        character.currentRoom = null;
        await this.characterRepository.save(character);
        console.log(`RoomService: Personaje ${characterId} ha salido de la sala ${oldRoomId}.`);

        if (oldRoom) {
            const roomAfterLeave = await this.roomRepository.findOne({ where: {id: oldRoomId}, relations: ['playerCharacters']});
            if (roomAfterLeave && (roomAfterLeave.playerCharacters?.length || 0) === 0) { 
                console.log(`RoomService: Sala ${oldRoomId} ha quedado vacía, marcando como cerrada.`);
                roomAfterLeave.status = 'closed';
                await this.roomRepository.save(roomAfterLeave);
            }
        }
        return character;
    }

    /**
     * Obtiene una sala por su ID, incluyendo sus relaciones principales.
     * @param roomId ID de la sala.
     * @returns La sala encontrada o null.
     */
    async getRoomById(roomId: string): Promise<Room | null> {
        return this.roomRepository.findOne({ where: { id: roomId }, relations: ['playerCharacters', 'playerCharacters.user', 'host'] });
    }

    /**
     * Obtiene todas las salas activas (en estado 'waiting') que no están llenas.
     * @returns Lista de salas activas disponibles.
     */
    async getActiveRooms(): Promise<Room[]> {
        const rooms = await this.roomRepository.find({ 
            where: { status: 'waiting' },
            relations: ['playerCharacters', 'host'] 
        });
        return rooms.filter(room => (room.playerCharacters?.length || 0) < room.maxPlayers);
    }
    
    /**
     * Obtiene todos los personajes presentes en una sala.
     * @param roomId ID de la sala.
     * @returns Lista de personajes en la sala.
     */
    async getPlayersInRoom(roomId: string): Promise<PlayerCharacter[]> {
        const room = await this.roomRepository.findOne({ where: {id: roomId}, relations: ['playerCharacters', 'playerCharacters.user']});
        return room ? room.playerCharacters || [] : [];
    }

    /**
     * Cambia el estado de una sala a 'in-game' si está en estado 'waiting'.
     * @param roomId ID de la sala.
     * @returns La sala actualizada o null si no se pudo iniciar el juego.
     */
    async startGameInRoom(roomId: string): Promise<Room | null> {
        const room = await this.roomRepository.findOneBy({id: roomId});
        if (room && room.status === 'waiting') {
            room.status = 'in-game';
            await this.roomRepository.save(room);
            console.log(`RoomService: Juego iniciado en sala ${roomId}`);
            return room;
        }
        console.warn(`RoomService: No se pudo iniciar juego en sala ${roomId}. Estado actual: ${room?.status}`);
        return null;
    }

    /**
     * Obtiene todas las salas creadas por un usuario anfitrión.
     * @param hostUserId ID del usuario anfitrión.
     * @returns Lista de salas creadas por el usuario.
     */
    async getRoomsByHost(hostUserId: string): Promise<Room[]> {
        console.log(`RoomService: Buscando salas creadas por hostUserId: ${hostUserId}`);
        return this.roomRepository.find({
            where: { hostUserId },
            relations: ['playerCharacters', 'host'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Actualiza la apariencia de un personaje.
     * Solo se actualizan los campos que cambian respecto al valor actual.
     * @param characterId ID del personaje.
     * @param newStyles Objeto con los nuevos estilos de apariencia.
     * @returns El personaje actualizado o null si no se encontró.
     */
    async updateCharacterAppearance(
        characterId: string, 
        newStyles: {
            bodyStyle?: string;
            hairStyle?: string;
            shirtStyle?: string;
            pantsStyle?: string;
        }
    ): Promise<PlayerCharacter | null> {
        const character = await this.characterRepository.findOneBy({ id: characterId });
        if (!character) {
            console.error(`updateCharacterAppearance: Personaje con ID ${characterId} no encontrado.`);
            return null;
        }

        let changed = false;
        if (newStyles.bodyStyle !== undefined && character.bodyStyle !== newStyles.bodyStyle) {
            character.bodyStyle = newStyles.bodyStyle;
            changed = true;
        }
        if (newStyles.hairStyle !== undefined && character.hairStyle !== newStyles.hairStyle) {
            character.hairStyle = newStyles.hairStyle;
            changed = true;
        }
        if (newStyles.shirtStyle !== undefined && character.shirtStyle !== newStyles.shirtStyle) {
            character.shirtStyle = newStyles.shirtStyle;
            changed = true;
        }
        if (newStyles.pantsStyle !== undefined && character.pantsStyle !== newStyles.pantsStyle) {
            character.pantsStyle = newStyles.pantsStyle;
            changed = true;
        }

        if (changed) {
            await this.characterRepository.save(character);
            console.log(`updateCharacterAppearance: Apariencia actualizada para personaje ${characterId}.`);
        } else {
            console.log(`updateCharacterAppearance: No hubo cambios en la apariencia para personaje ${characterId}.`);
        }
        return character;
    }
}
