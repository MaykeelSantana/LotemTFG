import React, { useState, useEffect } from 'react';
import PostList from './PostList';
import PostForm from './PostForm';
import { useAuthStore } from '../../../store/auth.store';
import { UserRoleClient } from '../../../services/auth.service';
import type { CmsPostResponse } from '../../../types/cms.types';

/**
 * Página de administración para la gestión de posts.
 * Permite a usuarios con rol ADMIN o EDITOR crear, editar y listar posts.
 * Controla el acceso según la autenticación y el rol del usuario.
 */
const AdminPostManagementPage: React.FC = () => {
    const { user, isAuthenticated } = useAuthStore();

    const [currentView, setCurrentView] = useState<'list' | 'form'>('list');
    const [editingPostId, setEditingPostId] = useState<string | null>(null);

    const canManagePosts = isAuthenticated && user &&
        (user.role === UserRoleClient.ADMIN || user.role === UserRoleClient.EDITOR);

    useEffect(() => {
        if (!canManagePosts) {
            setCurrentView('list');
            setEditingPostId(null);
        }
    }, [canManagePosts]);

    if (!isAuthenticated) {
        return <div className="p-4 text-center text-red-500">Debes iniciar sesión para acceder a esta sección.</div>;
    }

    if (!canManagePosts) {
        return (
            <div className="p-4 text-center text-red-500">
                <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
                <p>No tienes los permisos necesarios para gestionar posts.</p>
            </div>
        );
    }

    const handleNewPost = () => {
        setEditingPostId(null);
        setCurrentView('form');
    };

    const handleEditPost = (postId: string) => {
        setEditingPostId(postId);
        setCurrentView('form');
    };

    const handleSaveSuccess = (savedPost: CmsPostResponse) => {
        setCurrentView('list');
        setEditingPostId(null);
    };

    const handleCancelForm = () => {
        setCurrentView('list');
        setEditingPostId(null);
    };

    return (
        <div className="container mx-auto p-4 sm:p-6">
            <header className="mb-8 pb-4 border-b border-slate-700">
                <h1 className="text-3xl sm:text-4xl font-bold text-sky-400">Gestión de Posts (Admin)</h1>
            </header>

            {currentView === 'list' && (
                <PostList
                    onEditPost={handleEditPost}
                    onNewPost={handleNewPost}
                />
            )}
            {currentView === 'form' && (
                <PostForm
                    postIdToEdit={editingPostId}
                    onSaveSuccess={handleSaveSuccess}
                    onCancel={handleCancelForm}
                />
            )}
        </div>
    );
};

export default AdminPostManagementPage;
