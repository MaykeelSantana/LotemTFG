import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/User.entity';
import { PlayerCharacter } from '../../character/entities/PlayerCharacter.entity';
import { RoomPlacedItem } from './RoomPlacedItem.entity';

/**
 * Tipos posibles para el estado de una sala.
 * - waiting: La sala está esperando jugadores.
 * - in-game: La partida está en curso.
 * - closed: La sala ha finalizado o cerrado.
 */
export type RoomStatus = "waiting" | "in-game" | "closed";

/**
 * Entidad que representa una sala de juego.
 * 
 * Propiedades:
 * - id: Identificador único de la sala (UUID).
 * - name: Nombre de la sala.
 * - hostUserId: ID del usuario que es anfitrión de la sala.
 * - host: Relación con el usuario anfitrión.
 * - status: Estado actual de la sala.
 * - maxPlayers: Número máximo de jugadores permitidos.
 * - playerCharacters: Relación con los personajes de los jugadores en la sala.
 * - placedItems: Relación con los objetos colocados en la sala.
 * - createdAt: Fecha de creación de la sala.
 * - updatedAt: Fecha de última actualización de la sala.
 */
@Entity('rooms')
export class Room {
    /** Identificador único de la sala (UUID). */
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /** Nombre de la sala. */
    @Column({ type: 'varchar', length: 100 })
    name!: string;

    /** ID del usuario anfitrión de la sala. */
    @Column({ type: 'uuid' })
    hostUserId!: string;

    /** Relación con el usuario anfitrión. */
    @ManyToOne(() => User)
    @JoinColumn({ name: 'hostUserId' })
    host!: User;

    /** Estado actual de la sala. */
    @Column({ type: 'varchar', length: 20, default: 'waiting' })
    status!: RoomStatus;

    /** Número máximo de jugadores permitidos en la sala. */
    @Column({ type: 'int', default: 4 })
    maxPlayers!: number;

    /** Personajes de los jugadores que están en la sala. */
    @OneToMany(() => PlayerCharacter, (character) => character.currentRoom)
    playerCharacters!: PlayerCharacter[];

    /** Objetos colocados en la sala. */
    @OneToMany(() => RoomPlacedItem, placedItem => placedItem.room)
    placedItems!: RoomPlacedItem[];

    /** Fecha de creación de la sala. */
    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    /** Fecha de última actualización de la sala. */
    @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
