import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/User.entity';
import { Comment } from '../../comments/entities/Comment.entity';
import { Like } from '../../likes/entities/Like.entity';

/**
 * Enumera los posibles estados de una publicación.
 * - DRAFT: Borrador, aún no publicada.
 * - PUBLISHED: Publicada y visible.
 * - ARCHIVED: Archivada, no visible públicamente.
 */
export enum PostStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
}

/**
 * Enumera los tipos de publicaciones posibles.
 * - NEWS: Noticia larga.
 * - TWEET: Publicación corta tipo tweet.
 * - UPDATE: Actualización.
 * - EVENT: Evento.
 */
export enum PostType {
    NEWS = 'news',
    TWEET = 'tweet',
    UPDATE = 'update',
    EVENT = 'event',
}

/**
 * Entidad que representa una publicación en el sistema.
 * Incluye información sobre el autor, contenido, tipo, estado,
 * fechas relevantes y relaciones con comentarios y "me gusta".
 */
@Entity('posts')
export class Post {
    /**
     * Identificador único de la publicación (UUID).
     */
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /**
     * Identificador del autor (usuario) de la publicación.
     */
    @Column()
    authorId!: string;

    /**
     * Relación con la entidad User que representa al autor.
     */
    @ManyToOne(() => User, { eager: false })
    @JoinColumn({ name: 'authorId' })
    author!: User;

    /**
     * Título de la publicación (opcional, útil para noticias).
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    title!: string | null;

    /**
     * Contenido principal de la publicación.
     */
    @Column('text')
    contentText!: string;

    /**
     * URL de una imagen destacada (opcional).
     */
    @Column({ type: 'varchar', length: 2048, nullable: true })
    imageUrl!: string | null;

    /**
     * Tipo de publicación (news, tweet, update, event).
     */
    @Column({
        type: 'enum',
        enum: PostType,
        default: PostType.TWEET,
    })
    type!: PostType;

    /**
     * Estado de la publicación (draft, published, archived).
     */
    @Column({
        type: 'enum',
        enum: PostStatus,
        default: PostStatus.DRAFT,
    })
    status!: PostStatus;

    /**
     * Fecha y hora de publicación (opcional).
     */
    @Column({ type: 'timestamp with time zone', nullable: true })
    publishedAt!: Date | null;

    /**
     * Fecha y hora de creación de la publicación.
     */
    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;

    /**
     * Fecha y hora de la última actualización de la publicación.
     */
    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt!: Date;

    /**
     * Número de "me gusta" recibidos.
     */
    @Column({ type: 'int', default: 0 })
    likeCount!: number;

    /**
     * Número de comentarios recibidos.
     */
    @Column({ type: 'int', default: 0 })
    commentCount!: number;

    /**
     * Relación con los "me gusta" recibidos en la publicación.
     */
    @OneToMany(() => Like, like => like.post)
    likesReceived!: Like[];

    /**
     * Relación con los comentarios realizados en la publicación.
     */
    @OneToMany(() => Comment, comment => comment.post)
    commentsOnPost!: Comment[];
}
