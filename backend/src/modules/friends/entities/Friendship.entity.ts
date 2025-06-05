import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/User.entity';

/**
 * Enum que representa los posibles estados de una relación de amistad.
 */
export enum FriendshipStatus {
    PENDING = 'pending',   // Solicitud enviada, esperando respuesta
    ACCEPTED = 'accepted', // Amistad aceptada
    DECLINED = 'declined', // Solicitud rechazada
    BLOCKED = 'blocked',   // Uno de los usuarios ha bloqueado al otro
}

/**
 * Entidad que representa una relación de amistad entre dos usuarios.
 * 
 * - Cada registro representa una relación única entre dos usuarios.
 * - userId1 y userId2 almacenan los IDs de los usuarios involucrados, 
 *   ordenados alfabéticamente/numéricamente para evitar duplicados.
 * - status indica el estado actual de la relación.
 * - requestedByUserId indica quién envió la solicitud de amistad.
 * - Las relaciones ManyToOne permiten acceder a los datos completos de los usuarios relacionados.
 */
@Entity('friendships')
@Index(['userId1', 'userId2'], { unique: true })
export class Friendship {
    /**
     * Identificador único de la relación de amistad.
     */
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /**
     * ID del primer usuario (el menor alfabética/numéricamente).
     */
    @Column()
    userId1!: string;

    /**
     * Referencia al primer usuario.
     */
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId1' })
    user1!: User;

    /**
     * ID del segundo usuario (el mayor alfabética/numéricamente).
     */
    @Column()
    userId2!: string;

    /**
     * Referencia al segundo usuario.
     */
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId2' })
    user2!: User;

    /**
     * Estado actual de la relación de amistad.
     */
    @Column({
        type: 'enum',
        enum: FriendshipStatus,
        default: FriendshipStatus.PENDING,
    })
    status!: FriendshipStatus;

    /**
     * ID del usuario que envió la solicitud de amistad.
     */
    @Column()
    requestedByUserId!: string;

    /**
     * Referencia al usuario que envió la solicitud.
     */
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'requestedByUserId' })
    requestedBy!: User;

    /**
     * Fecha de creación del registro de amistad.
     */
    @CreateDateColumn()
    createdAt!: Date;

    /**
     * Fecha de la última actualización del registro.
     */
    @UpdateDateColumn()
    updatedAt!: Date;
}