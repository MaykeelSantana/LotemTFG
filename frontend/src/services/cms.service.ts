import { useAuthStore } from '../store/auth.store';
import type {
    CreatePostPayload,
    UpdatePostPayload,
    CmsPostResponse,
    FetchCmsPostsParams,
    ImageUploadResponse,
    CommentClient
} from '../types/cms.types';
import { FeedPostClient } from './feed.service';

const BASE_URL = 'http://localhost:3001';

/**
 * Obtiene el token de autenticación del store.
 */
const getAuthToken = (): string | null => {
    return useAuthStore.getState().token;
};

/**
 * Maneja la respuesta de la API CMS, lanzando un error si la respuesta no es exitosa.
 * @param response Respuesta de la API
 * @returns Datos de la respuesta parseados
 */
async function handleCmsApiResponse<T>(response: Response): Promise<T> {
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
 * Servicio para interactuar con la API CMS.
 */
export const cmsApiService = {
    /**
     * Sube una imagen para un post.
     * @param imageFile Archivo de imagen a subir
     * @returns Respuesta con la URL de la imagen subida
     */
    uploadPostImage: async (imageFile: File): Promise<ImageUploadResponse> => {
        const token = getAuthToken();
        if (!token) throw new Error("CMS: No autenticado para subir imagen.");

        const formData = new FormData();
        formData.append('chatImage', imageFile);

        const response = await fetch(`${BASE_URL}/api/chat/upload-image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        return handleCmsApiResponse<ImageUploadResponse>(response);
    },

    /**
     * Crea un nuevo post en el CMS.
     * @param postData Datos del post a crear
     * @returns Post creado
     */
    createPost: async (postData: CreatePostPayload): Promise<CmsPostResponse> => {
        const token = getAuthToken();
        if (!token) throw new Error("CMS: No autenticado.");
        const response = await fetch(`${BASE_URL}/api/cms/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(postData),
        });
        return handleCmsApiResponse<CmsPostResponse>(response);
    },

    /**
     * Obtiene una lista de posts con paginación y filtros.
     * @param params Parámetros de búsqueda y paginación
     * @returns Lista de posts y total de resultados
     */
    getPosts: async (params: FetchCmsPostsParams = {}): Promise<{ posts: CmsPostResponse[], total: number }> => {
        const token = getAuthToken();
        if (!token) throw new Error("CMS: No autenticado.");
        
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
        });

        const response = await fetch(`${BASE_URL}/api/cms/posts?${query.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleCmsApiResponse<{ posts: CmsPostResponse[], total: number }>(response);
    },

    /**
     * Obtiene un post por su ID.
     * @param postId ID del post
     * @returns Post encontrado
     */
    getPostById: async (postId: string): Promise<CmsPostResponse> => {
        const token = getAuthToken();
        if (!token) throw new Error("CMS: No autenticado.");
        const response = await fetch(`${BASE_URL}/api/cms/posts/${postId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleCmsApiResponse<CmsPostResponse>(response);
    },

    /**
     * Actualiza un post existente.
     * @param postId ID del post a actualizar
     * @param postData Datos a actualizar
     * @returns Post actualizado
     */
    updatePost: async (postId: string, postData: UpdatePostPayload): Promise<CmsPostResponse> => {
        const token = getAuthToken();
        if (!token) throw new Error("CMS: No autenticado.");
        const response = await fetch(`${BASE_URL}/api/cms/posts/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(postData),
        });
        return handleCmsApiResponse<CmsPostResponse>(response);
    },

    /**
     * Elimina un post por su ID.
     * @param postId ID del post a eliminar
     * @returns Resultado de la operación
     */
    deletePost: async (postId: string): Promise<{ success: boolean, message: string }> => {
        const token = getAuthToken();
        if (!token) throw new Error("CMS: No autenticado.");
        const response = await fetch(`${BASE_URL}/api/cms/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleCmsApiResponse<{ success: boolean, message: string }>(response);
    },

    /**
     * Crea un post de jugador en el feed.
     * @param contentText Texto del post
     * @param imageUrl URL de la imagen (opcional)
     * @returns Post creado en el feed
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

        const response = await fetch(`${BASE_URL}/api/feed/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        return handleCmsApiResponse<FeedPostClient>(response);
    },

    /**
     * Obtiene los comentarios de un post.
     * @param postId ID del post
     * @param page Página de resultados (por defecto 1)
     * @param limit Cantidad de comentarios por página (por defecto 10)
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
        const response = await fetch(`${BASE_URL}/api/posts/${postId}/comments?${query.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleCmsApiResponse<{ comments: CommentClient[], total: number }>(response);
    },

    /**
     * Agrega un comentario a un post.
     * @param postId ID del post
     * @param contentText Texto del comentario
     * @param parentCommentId ID del comentario padre (opcional)
     * @returns Comentario creado y conteo actualizado
     */
    addComment: async (
        postId: string, 
        contentText: string, 
        parentCommentId?: string | null
    ): Promise<{ success: boolean; comment: CommentClient; newCommentCount?: number }> => {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error("No autenticado.");
        
        const response = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ contentText, parentCommentId }),
        });
        return handleCmsApiResponse<{ success: boolean; comment: CommentClient; newCommentCount?: number }>(response);
    },

    /**
     * Elimina un comentario por su ID.
     * @param commentId ID del comentario a eliminar
     * @returns Resultado de la operación y conteo actualizado
     */
    deleteComment: async (commentId: string): Promise<{ success: boolean; message?: string; newCommentCount?: number }> => {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error("No autenticado.");

        const response = await fetch(`${BASE_URL}/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return handleCmsApiResponse<{ success: boolean; message?: string; newCommentCount?: number }>(response);
    }
};