import AppDataSource from '../../config/data-source';
import { User } from '../auth/entities/User.entity';
import { Post } from '../posts/entities/Post.entity';
import { Comment } from './entities/Comment.entity';
import { Repository, IsNull } from 'typeorm';

/**
 * Servicio para la gestión de comentarios en publicaciones.
 * Permite crear, obtener y eliminar comentarios, así como actualizar el contador de comentarios en los posts.
 */
export class CommentService {
    private commentRepository: Repository<Comment>;
    private postRepository: Repository<Post>;
    private userRepository: Repository<User>;

    constructor() {
        this.commentRepository = AppDataSource.getRepository(Comment);
        this.postRepository = AppDataSource.getRepository(Post);
        this.userRepository = AppDataSource.getRepository(User);
    }

    /**
     * Crea un nuevo comentario en un post.
     * 
     * @param userId - ID del usuario que realiza el comentario.
     * @param postId - ID del post donde se realiza el comentario.
     * @param contentText - Texto del comentario.
     * @param parentCommentId - (Opcional) ID del comentario padre si es una respuesta.
     * @returns Objeto con el resultado de la operación, el comentario creado y el post actualizado.
     */
    async createComment(
        userId: string, 
        postId: string, 
        contentText: string, 
        parentCommentId?: string | null
    ): Promise<{ success: boolean; comment?: Comment; updatedPost?: Post; error?: string }> {
        if (!contentText.trim()) return { success: false, error: "El comentario no puede estar vacío." };

        const post = await this.postRepository.findOneBy({ id: postId });
        if (!post) return { success: false, error: "Post no encontrado." };

        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) return { success: false, error: "Usuario no encontrado." };

        let parent: Comment | null = null;
        if (parentCommentId) {
            parent = await this.commentRepository.findOneBy({ id: parentCommentId, postId });
            if (!parent) return { success: false, error: "Comentario padre no encontrado." };
        }

        const commentEntity = this.commentRepository.create({
            postId, userId, user, contentText, 
            parent: parent || undefined, 
            parentId: parent ? parent.id : null,
        });
        
        const savedComment = await this.commentRepository.save(commentEntity);

        const commentCount = await this.commentRepository.count({where: {postId}});
        post.commentCount = commentCount;
        await this.postRepository.save(post);

        const fullComment = await this.commentRepository.findOne({
            where: {id: savedComment.id}, 
            relations: ['user']
        });

        return { success: true, comment: fullComment || savedComment, updatedPost: post };
    }

    /**
     * Obtiene los comentarios de primer nivel de un post, paginados.
     * Incluye la información del usuario y un nivel de respuestas (hijos).
     * 
     * @param postId - ID del post.
     * @param page - Número de página (por defecto 1).
     * @param limit - Cantidad de comentarios por página (por defecto 10).
     * @returns Objeto con la lista de comentarios y el total, o un error.
     */
    async getCommentsForPost(
        postId: string, 
        page: number = 1, 
        limit: number = 10
    ): Promise<{ comments: Comment[], total: number } | { error: string }> {
        const [comments, total] = await this.commentRepository.findAndCount({
            where: { postId, parentId: IsNull() },
            relations: ['user', 'children', 'children.user'],
            order: { createdAt: 'ASC' }, 
            take: limit,
            skip: (page - 1) * limit,
        });
        return { comments, total };
    }

    /**
     * Elimina un comentario si el usuario es el autor.
     * Actualiza el contador de comentarios en el post correspondiente.
     * 
     * @param userId - ID del usuario que solicita la eliminación.
     * @param commentId - ID del comentario a eliminar.
     * @returns Objeto con el resultado de la operación y el post actualizado si corresponde.
     */
    async deleteComment(userId: string, commentId: string): Promise<{ success: boolean; updatedPost?: Post; message?: string; error?: string }> {
        const comment = await this.commentRepository.findOne({
            where: { id: commentId },
            relations: ['post']
        });

        if (!comment) return { success: false, error: "Comentario no encontrado." };
        if (comment.userId !== userId) {
            return { success: false, error: "No autorizado para eliminar este comentario." };
        }

        const postId = comment.postId;
        await this.commentRepository.remove(comment);

        const post = await this.postRepository.findOneBy({ id: postId });
        if (post) {
            const commentCount = await this.commentRepository.count({where: {postId}});
            post.commentCount = commentCount;
            await this.postRepository.save(post);
            return { success: true, message: "Comentario eliminado.", updatedPost: post };
        }
        return { success: true, message: "Comentario eliminado, post no encontrado para actualizar contador." };
    }
}