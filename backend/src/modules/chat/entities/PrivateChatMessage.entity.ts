import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../auth/entities/User.entity';
import { Friendship } from '../../friends/entities/Friendship.entity';

/**
 * Entidad que representa un mensaje privado entre dos usuarios en el contexto de una amistad.
 * Cada mensaje está asociado a una relación de amistad (Friendship) y almacena información relevante
 * como el remitente, destinatario, contenido, tipo de mensaje, estado de lectura y marca de tiempo.
 */
@Entity('private_chat_messages')
@Index(['friendshipId', 'timestamp'])
export class PrivateChatMessage {
    /**
     * Identificador único del mensaje (UUID).
     */
    @PrimaryGeneratedColumn('uuid')
    id?: string;

    /**
     * Identificador de la relación de amistad a la que pertenece el mensaje.
     */
    @Column()
    friendshipId?: string;

    /**
     * Relación con la entidad Friendship.
     * Si la amistad se elimina, los mensajes asociados también se eliminan (CASCADE).
     */
    @ManyToOne(() => Friendship, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'friendshipId' })
    friendship?: Friendship;

    /**
     * Identificador del usuario que envía el mensaje.
     */
    @Column()
    senderId?: string;

    /**
     * Nombre de usuario del remitente en el momento de enviar el mensaje.
     * Permite mantener el historial incluso si el usuario cambia su nombre posteriormente.
     */
    @Column()
    senderUsername?: string;

    /**
     * Relación con la entidad User para el remitente.
     * Si el usuario se elimina, el mensaje persiste y la relación se establece en NULL.
     */
    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'senderId' })
    sender?: User;

    /**
     * Identificador del usuario que recibe el mensaje.
     */
    @Column()
    receiverId?: string;

    /**
     * Relación con la entidad User para el destinatario.
     * Si el usuario se elimina, el mensaje persiste y la relación se establece en NULL.
     */
    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'receiverId' })
    receiver?: User;

    /**
     * Contenido textual del mensaje.
     */
    @Column('text', { nullable: true })
    messageText?: string;

    /**
     * Tipo de mensaje: 'text' para texto, 'image' para imagen, etc.
     */
    @Column({ default: 'text' })
    messageType?: string;

    /**
     * URL de la imagen asociada al mensaje (si aplica).
     */
    @Column({ type: 'varchar', length: 2048, nullable: true })
    imageUrl?: string | null;

    /**
     * Marca de tiempo de creación del mensaje (con zona horaria).
     */
    @CreateDateColumn({ type: 'timestamp with time zone' })
    timestamp?: Date;

    /**
     * Indica si el mensaje ha sido leído por el destinatario.
     */
    @Column({ default: false })
    isRead?: boolean;
}