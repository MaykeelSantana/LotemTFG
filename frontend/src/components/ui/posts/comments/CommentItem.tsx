import React from 'react';
import type { CommentClient } from '../../../../types/cms.types';
import { useAuthStore } from '../../../../store/auth.store';

interface CommentItemProps {
    comment: CommentClient;
    postId: string;
    onDelete: (commentId: string) => void;
    onReply: (comment: CommentClient) => void;
    level?: number;
}

/**
 * Componente para mostrar un comentario individual, incluyendo opciones para responder o eliminar.
 * Permite renderizar comentarios anidados (respuestas) de forma recursiva.
 *
 * @param {CommentItemProps} props - Propiedades del componente.
 * @param {CommentClient} props.comment - Objeto con la información del comentario.
 * @param {string} props.postId - ID del post al que pertenece el comentario.
 * @param {(commentId: string) => void} props.onDelete - Función para eliminar el comentario.
 * @param {(comment: CommentClient) => void} props.onReply - Función para responder al comentario.
 * @param {number} [props.level=0] - Nivel de indentación para comentarios anidados.
 */
const CommentItem: React.FC<CommentItemProps> = ({ comment, postId, onDelete, onReply, level = 0 }) => {
    const { user: currentUser } = useAuthStore();
    const canDelete = currentUser?.id === comment.userId;

    return (
        <div className={`py-2 ${level > 0 ? `ml-${level * 4} pl-2 border-l-2 border-slate-700` : ''}`}>
            <div className="flex items-start space-x-2">
                <div className="flex-grow bg-slate-700/50 p-2.5 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs sm:text-sm font-semibold text-sky-300">{comment.username || 'Usuario Desconocido'}</span>
                        <span className="text-xs text-slate-500">
                            {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">{comment.contentText}</p>
                    <div className="mt-1.5 flex items-center space-x-3">
                        <button 
                            onClick={() => onReply(comment)}
                            className="text-xs text-slate-400 hover:text-teal-400 transition-colors"
                        >
                            Responder
                        </button>
                        {canDelete && (
                            <button 
                                onClick={() => onDelete(comment.id)}
                                className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                            >
                                Eliminar
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {comment.children && comment.children.length > 0 && (
                <div className="mt-2">
                    {comment.children.map(childComment => (
                        <CommentItem 
                            key={childComment.id} 
                            comment={childComment} 
                            postId={postId}
                            onDelete={onDelete}
                            onReply={onReply}
                            level={level + 1} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentItem;