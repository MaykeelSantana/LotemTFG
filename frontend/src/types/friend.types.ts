/**
 * Representa a un amigo de un usuario.
 */
export interface Friend {
    id: string; // Identificador del usuario amigo
    username: string;
    friendshipId: string; // Identificador de la relación de amistad
}

/**
 * Información mostrada en la UI para una solicitud de amistad.
 */
export interface FriendRequestInfo {
    id: string; // Identificador de la solicitud de amistad
    otherUserId: string; // Identificador del otro usuario involucrado
    otherUsername: string; // Nombre de usuario del otro usuario
    createdAt: string; // Fecha de creación de la solicitud (formato ISO o Date)
}