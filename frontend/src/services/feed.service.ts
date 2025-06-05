import { useAuthStore } from '../store/auth.store';
import type { CmsPostTypeEnum, CommentClient } from '../types/cms.types';

/**
 * URL base de la API del juego.
 */
const API_BASE_URL = 'http://localhost:3001';

/**
 * Representa un post del feed como lo ve el cliente.
 */
export interface FeedPostClient {
    id: string;
    title: string | null;
    contentText: string;
    imageUrl: string | null;
    type: CmsPostTypeEnum;
    authorUsername: string;
    publishedAt: string | null;
    likeCount: number;
    commentCount: number;
    likedByCurrentUser?: boolean;
}

/**
 * Parámetros para obtener posts del feed.
 */
export interface FetchFeedPostsParams {
    page?: number;
    limit?: number;
    types?: CmsPostTypeEnum[];
}

/**
 * Maneja la respuesta de la API del juego.
 * Lanza un error si la respuesta no es exitosa.
 * @param response Respuesta de la API
 * @returns Datos de la respuesta tipados
 */
async function handleGameApiResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    const result = (contentType && contentType.includes("application/json")) 
        ? await response.json() 
        : { message: await response.text() };

    if (!response.ok) {
        throw new Error(result.message || `Error HTTP: ${response.status} ${response.statusText}`);
    }
    return result as T;
}

/**
 * Servicio para interactuar con la API del juego.
 */
export const gameApiService = {
    /**
     * Obtiene los posts del feed con filtros opcionales.
     * @param params Parámetros de paginación y filtrado
     * @returns Lista de posts y total
     */
    getFeedPosts: async (params: FetchFeedPostsParams): Promise<{ posts: FeedPostClient[], total: number }> => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.types && params.types.length > 0) {
            params.types.forEach(t => query.append('type', t));
        }
        const response = await fetch(`${API_BASE_URL}/api/feed/posts?${query.toString()}`);
        return handleGameApiResponse<{ posts: FeedPostClient[], total: number }>(response);
    },

    /**
     * Crea un nuevo post para el jugador autenticado.
     * @param contentText Texto del post
     * @param imageUrl URL de la imagen (opcional)
     * @returns El post creado
     */
    createPlayerPost: async (
        contentText: string, 
        imageUrl?: string | null
    ): Promise<FeedPostClient> => {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error("No autenticado para crear un post.");

        const payload = {
            contentText,
            imageUrl: imageUrl || null,
        };

        const response = await fetch(`${API_BASE_URL}/api/feed/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        return handleGameApiResponse<FeedPostClient>(response);
    },

    /**
     * Da "me gusta" a un post.
     * @param postId ID del post
     * @returns Estado del like y contador actualizado
     */
    likePost: async (postId: string): Promise<{ success: boolean; likeCount?: number; likedByCurrentUser?: boolean; message?: string }> => {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error("No autenticado.");
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleGameApiResponse<{ success: boolean; likeCount?: number; likedByCurrentUser?: boolean; message?: string }>(response);
    },

    /**
     * Quita el "me gusta" de un post.
     * @param postId ID del post
     * @returns Estado del like y contador actualizado
     */
    unlikePost: async (postId: string): Promise<{ success: boolean; likeCount?: number; likedByCurrentUser?: boolean; message?: string }> => {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error("No autenticado.");
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleGameApiResponse<{ success: boolean; likeCount?: number; likedByCurrentUser?: boolean; message?: string }>(response);
    },

    /**
     * Obtiene el estado de "me gusta" para una lista de posts.
     * @param postIds IDs de los posts
     * @returns IDs de los posts que le gustan al usuario
     */
    getLikedStatusForPosts: async (postIds: string[]): Promise<{ success: boolean; likedPostIds?: string[] }> => {
        const token = useAuthStore.getState().token;
        if (!token || postIds.length === 0) return { success: true, likedPostIds: [] };
        const response = await fetch(`${API_BASE_URL}/api/posts/liked-status`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ postIds }),
        });
        return handleGameApiResponse<{ success: boolean; likedPostIds?: string[] }>(response);
    },

    /**
     * Obtiene los comentarios de un post.
     * @param postId ID del post
     * @param page Página de resultados
     * @param limit Cantidad por página
     * @returns Lista de comentarios y total
     */
    getCommentsForPost: async (
        postId: string, 
        page: number = 1, 
        limit: number = 10
    ): Promise<{ comments: CommentClient[], total: number }> => {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error("No autenticado.");
        const query = new URLSearchParams({ page: String(page), limit: String(limit) });
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments?${query.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleGameApiResponse<{ comments: CommentClient[], total: number }>(response);
    },

    /**
     * Agrega un comentario a un post.
     * @param postId ID del post
     * @param contentText Texto del comentario
     * @param parentCommentId ID del comentario padre (opcional)
     * @returns Comentario creado y nuevo contador de comentarios
     */
    addComment: async (
        postId: string, 
        contentText: string, 
        parentCommentId?: string | null
    ): Promise<{ success: boolean; comment: CommentClient; newCommentCount?: number }> => {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error("No autenticado.");
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ contentText, parentCommentId }),
        });
        return handleGameApiResponse<{ success: boolean; comment: CommentClient; newCommentCount?: number }>(response);
    },

    /**
     * Elimina un comentario.
     * @param commentId ID del comentario
     * @returns Estado de la operación y nuevo contador de comentarios
     */
    deleteComment: async (commentId: string): Promise<{ success: boolean; message?: string; newCommentCount?: number }> => {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error("No autenticado.");
        const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleGameApiResponse<{ success: boolean; message?: string; newCommentCount?: number }>(response);
    }
};
