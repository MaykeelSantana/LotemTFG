import { 
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, 
    UpdateDateColumn, ManyToOne, JoinColumn, Tree, TreeChildren, 
    TreeParent 
} from 'typeorm';
import { User } from '../../auth/entities/User.entity';
import { Post } from '../../posts/entities/Post.entity';

/**
 * Entidad que representa un comentario en un post.
 * Soporta comentarios anidados mediante estructura de árbol (materialized-path).
 * Cada comentario pertenece a un post y a un usuario.
 * Puede tener un comentario padre (para respuestas) y múltiples hijos (respuestas a este comentario).
 */
@Entity('comments')
@Tree("materialized-path")
export class Comment {
    /**
     * Identificador único del comentario (UUID).
     */
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /**
     * Identificador del post al que pertenece el comentario.
     */
    @Column()
    postId!: string;

    /**
     * Relación con la entidad Post.
     * Si el post se elimina, también se eliminan sus comentarios.
     */
    @ManyToOne(() => Post, post => post.commentsOnPost, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post!: Post;

    /**
     * Identificador del usuario autor del comentario.
     */
    @Column()
    userId!: string;

    /**
     * Relación con la entidad User.
     * Si el usuario se elimina, también se eliminan sus comentarios.
     */
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    /**
     * Contenido textual del comentario.
     */
    @Column('text')
    contentText!: string;

    /**
     * Comentarios hijos (respuestas a este comentario).
     */
    @TreeChildren()
    children!: Comment[];

    /**
     * Comentario padre (si este comentario es una respuesta).
     */
    @TreeParent({ onDelete: 'CASCADE' })
    @JoinColumn({ name: 'parentId' })
    parent!: Comment | null;

    /**
     * Identificador del comentario padre (nullable).
     * Facilita consultas directas por parentId.
     */
    @Column({ type: 'uuid', nullable: true })
    parentId!: string | null;

    /**
     * Fecha de creación del comentario.
     */
    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;

    /**
     * Fecha de última actualización del comentario.
     */
    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt!: Date;
}