import React, { useEffect, useState, useCallback } from 'react';
import { gameApiService, type FeedPostClient, type FetchFeedPostsParams } from '../../../services/feed.service'; 
import { CmsPostTypeEnum } from '../../../types/cms.types'; 
import { socketService } from '../../../services/socket.service'; 
import { useAuthStore } from '../../../store/auth.store';
import { CommentSection } from './comments/CommentSection';

interface PostFeedDisplayProps {
  feedTitle: string;
  postTypesFilter?: CmsPostTypeEnum[];
  defaultItemsPerPage?: number;
  className?: string; 
}

const API_BASE_URL =  'http://localhost:3001';

/**
 * Componente que muestra un feed de publicaciones con soporte para paginación, likes y comentarios.
 * Permite filtrar por tipo de publicación y muestra la cantidad de likes y comentarios por post.
 * 
 * @param {string} feedTitle - Título del feed a mostrar.
 * @param {CmsPostTypeEnum[]} [postTypesFilter] - Tipos de publicaciones a filtrar.
 * @param {number} [defaultItemsPerPage=10] - Cantidad de publicaciones por página.
 * @param {string} [className] - Clases CSS adicionales para el contenedor principal.
 * @returns {JSX.Element} El feed de publicaciones renderizado.
 */
const PostFeedDisplay: React.FC<PostFeedDisplayProps> = ({ 
  feedTitle, 
  postTypesFilter, 
  defaultItemsPerPage = 10,
  className 
}) => {
  const [posts, setPosts] = useState<FeedPostClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { user: currentUser } = useAuthStore(); 
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);

  const fetchPosts = useCallback(async (pageNum: number, loadMore = false) => {
    if (isLoading && loadMore) return; 

    setIsLoading(true);
    if (!loadMore) {
      setError(null); 
      setPosts([]); 
      setCurrentPage(1); 
      setHasMore(true);
    }

    const params: FetchFeedPostsParams = { page: pageNum, limit: defaultItemsPerPage };
    if (postTypesFilter && postTypesFilter.length > 0) {
      params.types = postTypesFilter;
    }

    try {
      const data = await gameApiService.getFeedPosts(params);
      if (data.posts) {
        let fetchedPosts = data.posts;
        if (currentUser?.id && fetchedPosts.length > 0) {
          const postIds = fetchedPosts.map(p => p.id);
          const likedResponse = await gameApiService.getLikedStatusForPosts(postIds);
          if (likedResponse.success && likedResponse.likedPostIds) {
            fetchedPosts = fetchedPosts.map(p => ({
              ...p,
              likedByCurrentUser: likedResponse.likedPostIds!.includes(p.id)
            }));
          }
        }
        setPosts(prev => loadMore ? [...prev, ...fetchedPosts] : fetchedPosts);
        const calculatedTotalPages = Math.ceil((data.total || 0) / defaultItemsPerPage);
        setTotalPages(calculatedTotalPages);
        setCurrentPage(pageNum);
      } 
    } catch (err: any) {  setError(err.message || "Error cargando."); } 
    finally { setIsLoading(false); }
  }, [defaultItemsPerPage, postTypesFilter, currentUser?.id]); 

  useEffect(() => {
    fetchPosts(1, false); 
  }, [postTypesFilter, fetchPosts]);

  const handleLikeToggle = async (postId: string, currentlyLiked: boolean | undefined) => {
    if (!currentUser?.id) {
      alert("Debes iniciar sesión para dar Me Gusta.");
      return;
    }

    const originalPosts = [...posts];
    setPosts(prevPosts => 
      prevPosts.map(p => 
        p.id === postId 
        ? { 
          ...p, 
          likedByCurrentUser: !currentlyLiked, 
          likeCount: currentlyLiked ? p.likeCount - 1 : p.likeCount + 1 
          } 
        : p
      )
    );
    
    try {
      let response;
      if (currentlyLiked) {
        response = await gameApiService.unlikePost(postId);
      } else {
        response = await gameApiService.likePost(postId);
      }
      if (response.success) {
         setPosts(prevPosts => 
          prevPosts.map(p => 
            p.id === postId 
            ? { ...p, 
              likeCount: response.likeCount !== undefined ? response.likeCount : p.likeCount,
              likedByCurrentUser: response.likedByCurrentUser !== undefined ? response.likedByCurrentUser : !currentlyLiked,
              } 
            : p
          )
        );
      } else {
        throw new Error(response.message || "Falló la operación de Me Gusta");
      }
    } catch (err) {
      setPosts(originalPosts); 
      alert((err as Error).message || "No se pudo procesar el 'Me Gusta'.");
    }
  };
  
  const toggleCommentSection = (postId: string) => {
    setExpandedCommentsPostId(prevId => prevId === postId ? null : postId);
  };

  const handleCommentPosted = (postId: string, newCommentCount: number) => {
    setPosts(prevPosts => prevPosts.map(p => 
      p.id === postId ? { ...p, commentCount: newCommentCount } : p
    ));
  };

  const getFullImageUrl = (relativeUrl?: string | null) => {
    if (!relativeUrl) return '';
    return `${API_BASE_URL}${relativeUrl}`; 
  };

  return (
    <div className={`post-feed-display px-4 sm:px-8 ${className || ''}`}>
    <h2 className="font-museo text-center text-white text-4xl sm:text-5xl font-bold mb-10 drop-shadow-lg">
      {feedTitle}
    </h2>

    <div className="space-y-10 max-w-5xl mx-auto">
      {posts.map(post => (
      <div
        key={post.id}
        className="bg-slate-800/70 backdrop-blur-md p-6 rounded-2xl shadow-md hover:shadow-slate-600 transition-shadow"
      >
        {post.imageUrl && (
        <div
          className="mb-4 overflow-hidden rounded-xl max-h-96 flex justify-center items-center bg-gradient-to-tr from-sky-100 to-indigo-100"
        >
          <img
          src={getFullImageUrl(post.imageUrl)}
          alt={post.title || 'Imagen del post'}
          className="w-full h-auto max-h-96 object-contain cursor-pointer transition-transform duration-300 hover:scale-105"
          onClick={() => window.open(getFullImageUrl(post.imageUrl), '_blank')}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
          />
        </div>
        )}

        {post.title && (
        <h3 className="text-2xl sm:text-3xl font-bold text-teal-300 mb-2 tracking-tight">
          {post.title}
        </h3>
        )}

        <div className="text-xs text-slate-400 mb-3 flex justify-between items-center">
        <span>
          Por <span className="font-medium text-slate-300">{post.authorUsername}</span>
          {post.publishedAt && ` el ${new Date(post.publishedAt).toLocaleDateString()}`}
        </span>
        <span className="px-2 py-0.5 bg-sky-600 text-white text-xs rounded-full capitalize">
          {post.type}
        </span>
        </div>

        <div className="text-sm sm:text-base text-slate-200 whitespace-pre-line break-words mb-4 prose prose-sm prose-invert max-w-none">
        {post.contentText}
        </div>

        <div className="pt-3 border-t border-slate-600 flex justify-between text-sm text-slate-400">
        <div className="flex items-center gap-6">
          <button
          onClick={() => handleLikeToggle(post.id, post.likedByCurrentUser)}
          className={`flex items-center gap-1 hover:text-red-400 transition-colors ${
            post.likedByCurrentUser ? 'text-red-500 font-semibold' : 'text-slate-400'
          }`}
          title={post.likedByCurrentUser ? 'Quitar Me Gusta' : 'Me Gusta'}
          aria-label="Botón de Me Gusta"
          >
          {post.likedByCurrentUser ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          )}
          <span>{post.likeCount}</span>
          </button>

          <button
          onClick={() => toggleCommentSection(post.id)}
          className="flex items-center gap-1 hover:text-sky-400 transition-colors"
          aria-label="Botón de Comentarios"
          >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
          <span>{post.commentCount} Comentarios</span>
          </button>
        </div>
        </div>

        {expandedCommentsPostId === post.id && (
        <div className="mt-4 pt-4 border-t border-slate-600/40">
          <CommentSection
          postId={post.id}
          onCommentCountChange={(newCount) => handleCommentPosted(post.id, newCount)}
          />
        </div>
        )}
      </div>
      ))}
    </div>

    {hasMore && !isLoading && posts.length > 0 && (
      <div className="text-center mt-12">
      <button
        onClick={() => fetchPosts(currentPage + 1, true)}
        className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-6 rounded-full text-sm shadow-md hover:shadow-lg transition-all"
      >
        Cargar más publicaciones
      </button>
      </div>
    )}

    {!hasMore && !isLoading && posts.length > 0 && totalPages > 1 && (
      <p className="text-center text-slate-500 mt-12 text-sm italic">Has llegado al final.</p>
    )}
    </div>
  );
};

export default PostFeedDisplay;