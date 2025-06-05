import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    OneToOne,
    OneToMany,
} from 'typeorm';
import { PlayerCharacter } from '../../character/entities/PlayerCharacter.entity';
import { PlayerInventoryItem } from '../../inventory/entities/PlayerInventoryItem.entity';
import { Friendship } from '../../friends/entities/Friendship.entity';

/**
 * Enum que define los posibles roles de usuario en el sistema.
 */
export enum UserRole {
    USER = 'user',
    EDITOR = 'editor',
    ADMIN = 'admin',
}

/**
 * Entidad que representa a un usuario en la base de datos.
 * Incluye información de autenticación, relaciones con personajes,
 * inventario, amistades y control de roles y verificación.
 */
@Entity('users')
export class User {
    /**
     * Identificador único del usuario (UUID).
     */
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /**
     * Nombre de usuario único.
     */
    @Column({ type: 'varchar', length: 50, unique: true })
    @Index()
    username!: string;

    /**
     * Correo electrónico único del usuario.
     */
    @Column({ type: 'varchar', length: 255, unique: true })
    @Index()
    email!: string;

    /**
     * Contraseña cifrada del usuario.
     */
    @Column({ type: 'varchar', length: 255 })
    password!: string;

    /**
     * Saldo de moneda virtual del usuario.
     */
    @Column({ type: 'int', default: 100 })
    currencyBalance!: number;

    /**
     * Relación uno a muchos con los objetos de inventario del usuario.
     */
    @OneToMany(() => PlayerInventoryItem, inventoryItem => inventoryItem.user)
    inventoryItems!: PlayerInventoryItem[];

    /**
     * Indica si el usuario ha verificado su cuenta.
     */
    @Column({ type: 'boolean', default: false })
    isVerified!: boolean;

    /**
     * Token de verificación para el usuario (opcional).
     */
    @Column({ type: 'varchar', nullable: true })
    verificationToken?: string | null;

    /**
     * Token para restablecimiento de contraseña (opcional).
     */
    @Column({ type: 'varchar', nullable: true })
    passwordResetToken?: string | null;

    /**
     * Fecha de expiración del token de restablecimiento de contraseña (opcional).
     */
    @Column({ type: 'timestamp with time zone', nullable: true })
    passwordResetExpires?: Date | null;

    /**
     * Relación uno a uno con el personaje principal del usuario.
     */
    @OneToOne(() => PlayerCharacter, (playerCharacter) => playerCharacter.user, {
        cascade: true,
        nullable: true,
        eager: false,
    })
    playerCharacter?: PlayerCharacter | null;

    /**
     * Amistades donde este usuario es el primer participante.
     */
    @OneToMany(() => Friendship, friendship => friendship.user1)
    friendshipsAsUser1?: Friendship[];

    /**
     * Amistades donde este usuario es el segundo participante.
     */
    @OneToMany(() => Friendship, friendship => friendship.user2)
    friendshipsAsUser2?: Friendship[];

    /**
     * Solicitudes de amistad enviadas por este usuario.
     */
    @OneToMany(() => Friendship, friendship => friendship.requestedBy)
    sentFriendRequests?: Friendship[];

    /**
     * Rol del usuario dentro del sistema.
     */
    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
    })
    role?: UserRole;

    /**
     * Fecha de creación del usuario.
     */
    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    /**
     * Fecha de última actualización del usuario.
     */
    @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}