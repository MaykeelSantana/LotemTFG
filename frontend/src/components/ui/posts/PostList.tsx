import React, { useEffect, useState, useCallback } from 'react';
import { cmsApiService } from '../../../services/cms.service';
import { 
    type CmsPostResponse, 
    type FetchCmsPostsParams, 
    CmsPostType, 
    CmsPostStatus,
    type CmsPostTypeEnum,
    type CmsPostStatusEnum
} from '../../../types/cms.types';

interface PostListProps {
    onEditPost: (postId: string) => void;
    onNewPost: () => void;
}

const API_BASE_URL = 'http://localhost:3001';

/**
 * Componente para listar, buscar, filtrar, paginar y gestionar posts del CMS.
 * Permite editar, eliminar y crear nuevos posts.
 * 
 * @component
 * @param {Object} props
 * @param {(postId: string) => void} props.onEditPost - Función para editar un post.
 * @param {() => void} props.onNewPost - Función para crear un nuevo post.
 */
const PostList: React.FC<PostListProps> = ({ onEditPost, onNewPost }) => {
    const [posts, setPosts] = useState<CmsPostResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalPosts, setTotalPosts] = useState(0);
    const [limit] = useState(5);

    const [filterStatus, setFilterStatus] = useState<CmsPostStatusEnum | ''>('');
    const [filterType, setFilterType] = useState<CmsPostTypeEnum | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [debounceSearchTerm, setDebounceSearchTerm] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebounceSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchPostsCMS = useCallback((pageToFetch = 1) => {
        setIsLoading(true);
        setError(null);
        const params: FetchCmsPostsParams = { page: pageToFetch, limit };
        if (filterStatus) params.status = filterStatus as CmsPostStatusEnum;
        if (filterType) params.type = filterType as CmsPostTypeEnum;
        if (debounceSearchTerm) params.searchTerm = debounceSearchTerm;

        cmsApiService.getPosts(params)
            .then(data => {
                setPosts(data.posts || []);
                setTotalPosts(data.total || 0);
                setTotalPages(Math.ceil((data.total || 0) / limit));
                setCurrentPage(pageToFetch);
            })
            .catch((err: Error) => {
                setError(err.message || "Error de red o API al cargar posts.");
                setPosts([]); 
                setTotalPosts(0); 
                setTotalPages(1);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [limit, filterStatus, filterType, debounceSearchTerm]);

    useEffect(() => {
        fetchPostsCMS(1);
    }, [fetchPostsCMS]);

    const handleDeletePost = async (postId: string, postTitle: string | null) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el post "${postTitle || postId}"?`)) {
            setIsLoading(true);
            try {
                const result = await cmsApiService.deletePost(postId);
                if (result.success) {
                    alert(result.message || "Post eliminado.");
                    fetchPostsCMS(posts.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage);
                } else {
                    throw new Error(result.message || "No se pudo eliminar el post.");
                }
            } catch (err: any) {
                alert(`Error: ${err.message}`);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const renderPagination = () => {
        if (totalPages <= 1) return null;
        const pageNumbers = [];
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
        return (
            <nav className="mt-6 flex justify-center items-center space-x-1">
                <button onClick={() => fetchPostsCMS(currentPage - 1)} disabled={currentPage <= 1 || isLoading}
                    className="px-3 py-1 bg-slate-600 rounded-md hover:bg-slate-500 disabled:opacity-50 text-sm">
                    Anterior
                </button>
                {pageNumbers.map(num => (
                    <button key={num} onClick={() => fetchPostsCMS(num)} disabled={isLoading}
                        className={`px-3 py-1 rounded-md text-sm ${currentPage === num ? 'bg-teal-500 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>
                        {num}
                    </button>
                ))}
                <button onClick={() => fetchPostsCMS(currentPage + 1)} disabled={currentPage >= totalPages || isLoading}
                     className="px-3 py-1 bg-slate-600 rounded-md hover:bg-slate-500 disabled:opacity-50 text-sm">
                    Siguiente
                </button>
            </nav>
        );
    };

    return (
        <div className="p-4 sm:p-6 bg-slate-800/70 rounded-lg shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl sm:text-3xl font-semibold text-sky-300">Gestionar Posts</h1>
                <button 
                    onClick={onNewPost} 
                    className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors"
                >
                    + Crear Nuevo Post
                </button>
            </div>

            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-700/60 rounded-md shadow">
                <input 
                    type="text" 
                    placeholder="Buscar por título/contenido..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-slate-600 border-slate-500 text-white placeholder-slate-400 p-2.5 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                />
                <select value={filterType} onChange={e => setFilterType(e.target.value as CmsPostTypeEnum | '')} className="bg-slate-600 border-slate-500 text-white p-2.5 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500">
                    <option value="">Todos los Tipos</option>
                    {Object.values(CmsPostType).map(typeVal => <option key={typeVal} value={typeVal}>{typeVal.charAt(0).toUpperCase() + typeVal.slice(1)}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as CmsPostStatusEnum | '')} className="bg-slate-600 border-slate-500 text-white p-2.5 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500">
                    <option value="">Todos los Estados</option>
                    {Object.values(CmsPostStatus).map(statusVal => <option key={statusVal} value={statusVal}>{statusVal.charAt(0).toUpperCase() + statusVal.slice(1)}</option>)}
                </select>
            </div>
            
            {isLoading && <p className="text-center text-yellow-300 py-5">Cargando posts...</p>}
            {error && <p className="text-red-400 bg-red-900/30 p-3 rounded text-center">{error}</p>}

            {!isLoading && !error && posts.length === 0 && (
                <p className="text-slate-400 text-center py-10">No se encontraron posts.</p>
            )}

            {!isLoading && posts.length > 0 && (
                <div className="overflow-x-auto custom-scrollbar shadow-md rounded-lg">
                    <table className="min-w-full bg-slate-700 text-slate-200">
                        <thead className="bg-slate-600">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Título</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Tipo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Estado</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Autor</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Publicado</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {posts.map(post => (
                                <tr key={post.id} className="hover:bg-slate-600/40 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">{post.title || '(Sin título)'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">{post.type}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 text-xs leading-5 font-semibold rounded-full ${
                                            post.status === CmsPostStatus.PUBLISHED ? 'bg-green-600 text-green-100' : 
                                            post.status === CmsPostStatus.DRAFT ? 'bg-yellow-600 text-yellow-100' : 'bg-gray-500 text-gray-100'}`}>
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{post.author?.username || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'No Publicado'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => onEditPost(post.id)} className="text-blue-400 hover:text-blue-300 mr-3 transition-colors">Editar</button>
                                        <button onClick={() => handleDeletePost(post.id, post.title)} className="text-red-400 hover:text-red-300 transition-colors">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {renderPagination()}
        </div>
    );
};

export default PostList;
