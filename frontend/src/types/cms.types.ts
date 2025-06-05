// Tipos y enums para el manejo de posts en el CMS

/**
 * Tipos de post permitidos en el CMS.
 */
export const CmsPostType = {
    NEWS: 'news',
    TWEET: 'tweet',
    UPDATE: 'update',
    EVENT: 'event',
} as const;
/**
 * Tipo unión derivado de CmsPostType.
 */
export type CmsPostTypeEnum = typeof CmsPostType[keyof typeof CmsPostType];

/**
 * Estados posibles de un post en el CMS.
 */
export const CmsPostStatus = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
} as const;
/**
 * Tipo unión derivado de CmsPostStatus.
 */
export type CmsPostStatusEnum = typeof CmsPostStatus[keyof typeof CmsPostStatus];

/**
 * Payload para crear un post.
 */
export interface CreatePostPayload {
    title?: string | null;
    contentText: string;
    imageUrl?: string | null;
    type: CmsPostTypeEnum;
    status?: CmsPostStatusEnum; 
}

/**
 * Payload para actualizar un post existente.
 */
export interface UpdatePostPayload {
    title?: string | null;
    contentText?: string;
    imageUrl?: string | null;
    type?: CmsPostTypeEnum;
    status?: CmsPostStatusEnum;
}

/**
 * Estructura de un post devuelto por la API del CMS.
 */
export interface CmsPostResponse {
    id: string;
    authorId: string;
    author?: { username: string };
    title: string | null;
    contentText: string;
    imageUrl: string | null;
    type: CmsPostTypeEnum;
    status: CmsPostStatusEnum;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    likeCount: number;
    commentCount: number;
    likedByCurrentUser?: boolean;
}

/**
 * Parámetros para obtener una lista de posts desde el CMS.
 */
export interface FetchCmsPostsParams {
    page?: number;
    limit?: number;
    type?: CmsPostTypeEnum;
    status?: CmsPostStatusEnum;
    searchTerm?: string;
}

/**
 * Respuesta de la API al subir una imagen.
 */
export interface ImageUploadResponse {
    success: boolean;
    message?: string;
    imageUrl?: string;
}

/**
 * Interfaz para comentarios de un post.
 */
export interface CommentClient {
    id: string;
    postId: string;
    userId: string;
    username: string;
    contentText: string;
    createdAt: string;
    parentId: string | null;
    children?: CommentClient[];
}