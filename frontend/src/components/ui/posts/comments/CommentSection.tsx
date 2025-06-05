import React, { useEffect, useState, useCallback } from 'react';
import { gameApiService } from '../../../../services/feed.service';
import type { CommentClient } from '../../../../types/cms.types';
import CommentItem from './CommentItem';
import { useAuthStore } from '../../../../store/auth.store';

interface CommentSectionProps {
    postId: string;
    onCommentCountChange: (newCount: number) => void;
}

const COMMENTS_PER_PAGE = 5;

/**
 * Sección de comentarios para un post.
 * Permite ver, agregar, responder y eliminar comentarios paginados.
 *
 * @component
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.postId - ID del post al que pertenecen los comentarios.
 * @param {(newCount: number) => void} props.onCommentCountChange - Callback para actualizar el contador de comentarios en el componente padre.
 * @returns {JSX.Element} Elemento JSX que representa la sección de comentarios.
 */
export const CommentSection: React.FC<CommentSectionProps> = ({ postId, onCommentCountChange }) => {
    const { user: currentUser } = useAuthStore();
    const [comments, setComments] = useState<CommentClient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newCommentText, setNewCommentText] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalComments, setTotalComments] = useState(0);
    const hasMoreComments = currentPage * COMMENTS_PER_PAGE < totalComments;
    const [replyingTo, setReplyingTo] = useState<CommentClient | null>(null);

    const fetchComments = useCallback(async (pageNum = 1, loadMore = false) => {
        if (!currentUser?.id) return;
        setIsLoading(true);
        if (!loadMore) setError(null);

        try {
            const data = await gameApiService.getCommentsForPost(postId, pageNum, COMMENTS_PER_PAGE);
            if (data.comments) {
                setComments(prev => loadMore ? [...prev, ...data.comments] : data.comments);
                setTotalComments(data.total || 0);
                setCurrentPage(pageNum);
            }
        } catch (err: any) {
            setError(err.message || "Error cargando comentarios.");
        } finally {
            setIsLoading(false);
        }
    }, [postId, currentUser?.id]);

    useEffect(() => {
        if (postId) {
            setComments([]);
            setCurrentPage(1);
            setTotalComments(0);
            fetchComments(1);
        }
    }, [postId, fetchComments]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = newCommentText.trim();
        if (!text || !currentUser?.id) return;

        setIsPostingComment(true);
        setError(null);
        try {
            const response = await gameApiService.addComment(postId, text, replyingTo?.id || null);
            if (response.success && response.comment) {
                setComments(prev => replyingTo ? prev : [response.comment!, ...prev.slice(0, COMMENTS_PER_PAGE -1)]);
                setNewCommentText('');
                setReplyingTo(null);
                if (response.newCommentCount !== undefined) {
                    onCommentCountChange(response.newCommentCount);
                }
                setTotalComments(prev => prev +1);
            } else {
                throw new Error((response as any).error || "No se pudo añadir el comentario.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsPostingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!currentUser?.id || !window.confirm("¿Seguro que quieres eliminar este comentario?")) return;
        try {
            const response = await gameApiService.deleteComment(commentId);
            if (response.success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                if (response.newCommentCount !== undefined) {
                    onCommentCountChange(response.newCommentCount);
                    setTotalComments(response.newCommentCount);
                }
            } else {
                throw new Error(response.message || "No se pudo eliminar el comentario.");
            }
        } catch (err: any) {
            setError(err.message);
        }
    };
    
    const handleSetReply = (comment: CommentClient | null) => {
        setReplyingTo(comment);
    };

    return (
        <div className="mt-4 pt-4">
            <h4 className="text-lg font-semibold text-sky-200 mb-3">Comentarios ({totalComments})</h4>
            {error && <p className="text-sm text-red-400 bg-red-800/30 p-2 rounded mb-3">{error}</p>}

            <form onSubmit={handleAddComment} className="mb-4">
                {replyingTo && (
                    <div className="mb-2 text-xs text-slate-400 p-1.5 bg-slate-700 rounded-t-md">
                        Respondiendo a {replyingTo.username}: <em className="truncate block max-w-xs">{replyingTo.contentText}</em>
                        <button type="button" onClick={() => setReplyingTo(null)} className="ml-2 text-red-400 hover:text-red-300 text-xs">[Cancelar Respuesta]</button>
                    </div>
                )}
                <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={replyingTo ? `Responde a ${replyingTo.username}...` : "Escribe un comentario..."}
                    rows={2}
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    required
                />
                <button 
                    type="submit" 
                    disabled={isPostingComment || !newCommentText.trim()}
                    className="mt-2 px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold rounded-md disabled:opacity-60"
                >
                    {isPostingComment ? 'Comentando...' : (replyingTo ? 'Responder' : 'Comentar')}
                </button>
            </form>

            {isLoading && comments.length === 0 && <p className="text-slate-400 text-sm">Cargando comentarios...</p>}
            
            <div className="space-y-2">
                {comments.map(comment => (
                    <CommentItem 
                        key={comment.id} 
                        comment={comment} 
                        postId={postId}
                        onDelete={handleDeleteComment}
                        onReply={handleSetReply}
                    />
                ))}
            </div>

            {hasMoreComments && !isLoading && (
                <div className="text-center mt-3">
                    <button 
                        onClick={() => fetchComments(currentPage + 1, true)}
                        className="text-xs text-sky-400 hover:text-sky-300 py-1"
                    >
                        Cargar más comentarios
                    </button>
                </div>
            )}
             {!isLoading && comments.length === 0 && !error && !hasMoreComments && (
                 <p className="text-slate-500 text-sm text-center py-3 italic">No hay comentarios aún.</p>
             )}
        </div>
    );
};