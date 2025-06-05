import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { User } from '../../auth/entities/User.entity';
import { Room } from '../../room/entities/Room.entity';

/**
 * Entidad que representa un personaje jugable asociado a un usuario.
 * Incluye información de posición, personalización visual y relación con sala y usuario.
 */
@Entity('player_characters')
export class PlayerCharacter {
    /**
     * Identificador único del personaje (UUID).
     */
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /**
     * Posición X del personaje en el entorno.
     * Valor por defecto: 50.
     */
    @Column({ type: 'int', default: 50 })
    x!: number;

    /**
     * Posición Y del personaje en el entorno.
     * Valor por defecto: 450.
     */
    @Column({ type: 'int', default: 450 })
    y!: number;

    /**
     * Identificador de la sala actual en la que se encuentra el personaje.
     * Puede ser nulo si el personaje no está en ninguna sala.
     */
    @Column({ type: 'uuid', nullable: true })
    currentRoomId?: string | null;

    /**
     * Relación muchos-a-uno con la entidad Room.
     * Si la sala se elimina, este campo se establece en null.
     */
    @ManyToOne(() => Room, (room: Room) => room.playerCharacters, {
        nullable: true,
        onDelete: 'SET NULL'
    })
    @JoinColumn({ name: 'currentRoomId' })
    currentRoom?: Room | null;

    /**
     * Estilo del cuerpo del personaje (por ejemplo: "male_base_white").
     */
    @Column({ type: 'varchar', length: 100, default: 'male_base_white' })
    bodyStyle!: string;

    /**
     * Estilo del cabello del personaje (por ejemplo: "default_hair").
     */
    @Column({ type: 'varchar', length: 100, default: 'default_hair' })
    hairStyle!: string;

    /**
     * Estilo de la camisa del personaje (por ejemplo: "default_shirt").
     */
    @Column({ type: 'varchar', length: 100, default: 'default_shirt' })
    shirtStyle!: string;

    /**
     * Estilo de los pantalones del personaje (por ejemplo: "default_pants").
     */
    @Column({ type: 'varchar', length: 100, default: 'default_pants' })
    pantsStyle!: string;

    /**
     * Relación uno-a-uno con la entidad User.
     * Si el usuario se elimina, el personaje también se elimina.
     */
    @OneToOne(() => User, user => user.playerCharacter, { onDelete: 'CASCADE' })
    @JoinColumn()
    user!: User;

    /**
     * Fecha de creación del personaje.
     */
    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    /**
     * Fecha de última actualización del personaje.
     */
    @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
