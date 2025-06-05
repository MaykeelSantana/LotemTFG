import React, { useState, useEffect, useRef } from 'react';
import { cmsApiService } from '../../../services/cms.service';
import { 
    CmsPostType, 
    CmsPostStatus, 
    type CmsPostTypeEnum, 
    type CmsPostStatusEnum, 
    type CreatePostPayload, 
    type UpdatePostPayload, 
    type CmsPostResponse
} from '../../../types/cms.types';

interface PostFormProps {
    /**
     * ID del post a editar. Si es null o undefined, el formulario crea un nuevo post.
     */
    postIdToEdit?: string | null;
    /**
     * Callback que se ejecuta al guardar exitosamente un post.
     * @param post El post guardado o actualizado.
     */
    onSaveSuccess: (post: CmsPostResponse) => void;
    /**
     * Callback para cancelar la edición o creación.
     */
    onCancel: () => void;
}

const API_BASE_URL = 'http://localhost:3001';

/**
 * Formulario para crear o editar un post en el CMS.
 * Permite ingresar título, contenido, imagen destacada, tipo y estado.
 * Soporta carga de imágenes y muestra mensajes de éxito o error.
 * 
 * @component
 * @param {PostFormProps} props
 * @returns {JSX.Element}
 */
const PostForm: React.FC<PostFormProps> = ({ postIdToEdit, onSaveSuccess, onCancel }) => {
    const [title, setTitle] = useState('');
    const [contentText, setContentText] = useState('');
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const [type, setType] = useState<CmsPostTypeEnum>(CmsPostType.TWEET);
    const [status, setStatus] = useState<CmsPostStatusEnum>(CmsPostStatus.DRAFT);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchPostData = async () => {
            if (postIdToEdit) {
                setIsLoadingData(true);
                setError(null);
                try {
                    const fetchedPost = await cmsApiService.getPostById(postIdToEdit);
                    setTitle(fetchedPost.title || '');
                    setContentText(fetchedPost.contentText);
                    setCurrentImageUrl(fetchedPost.imageUrl || null);
                    setType(fetchedPost.type);
                    setStatus(fetchedPost.status);
                    setImagePreview(null);
                    setSelectedImageFile(null);
                } catch (err: any) {
                    setError(err.message || "Error cargando post para editar.");
                } finally {
                    setIsLoadingData(false);
                }
            } else {
                setTitle(''); setContentText(''); setCurrentImageUrl(null); setImagePreview(null); setSelectedImageFile(null);
                setType(CmsPostType.TWEET); setStatus(CmsPostStatus.DRAFT); setError(null); setSuccessMessage(null);
            }
        };
        fetchPostData();
    }, [postIdToEdit]);

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError("La imagen es demasiado grande (máx 5MB).");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }
            setSelectedImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const removeCurrentImageHandler = () => setCurrentImageUrl(null);
    const cancelNewImageSelectionHandler = () => {
        setSelectedImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contentText.trim() && !selectedImageFile && !currentImageUrl) {
            setError("Se requiere contenido o una imagen.");
            return;
        }
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        let finalImageUrl = currentImageUrl;

        if (selectedImageFile) {
            setIsUploading(true);
            try {
                const uploadResult = await cmsApiService.uploadPostImage(selectedImageFile);
                if (uploadResult.success && uploadResult.imageUrl) {
                    finalImageUrl = uploadResult.imageUrl;
                } else {
                    throw new Error(uploadResult.message || "Fallo al subir la nueva imagen.");
                }
            } catch (uploadErr: any) {
                setError(uploadErr.message);
                setIsUploading(false);
                setIsSaving(false);
                return;
            } finally {
                setIsUploading(false);
            }
        }

        const postPayload: CreatePostPayload | UpdatePostPayload = {
            title: title || null,
            contentText: contentText.trim(),
            imageUrl: finalImageUrl,
            type,
            status,
        };

        try {
            let savedPost: CmsPostResponse;
            if (postIdToEdit) {
                savedPost = await cmsApiService.updatePost(postIdToEdit, postPayload as UpdatePostPayload);
                setSuccessMessage("¡Post actualizado con éxito!");
            } else {
                savedPost = await cmsApiService.createPost(postPayload as CreatePostPayload);
                setSuccessMessage("¡Post creado con éxito!");
            }
            if (!postIdToEdit) { 
                 setTitle(''); setContentText(''); setCurrentImageUrl(null); setImagePreview(null); setSelectedImageFile(null);
                 setType(CmsPostType.TWEET); setStatus(CmsPostStatus.DRAFT);
            }
            setTimeout(() => { 
                setSuccessMessage(null);
                onSaveSuccess(savedPost);
            }, 1500);
        } catch (saveErr: any) {
            setError(saveErr.message || "Error guardando el post.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingData && postIdToEdit) return <p className="text-center p-4 text-slate-300">Cargando datos del post...</p>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-slate-700/50 rounded-lg shadow-xl max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-teal-300 border-b border-slate-600 pb-3 mb-6">
                {postIdToEdit ? 'Editar' : 'Crear Nuevo'} Post
            </h2>
            
            {error && <div className="p-3 my-2 bg-red-200 text-red-800 rounded-md text-sm">{error}</div>}
            {successMessage && <div className="p-3 my-2 bg-green-200 text-green-800 rounded-md text-sm">{successMessage}</div>}
            
            <div>
                <label htmlFor="postTitle" className="block text-sm font-medium text-slate-300 mb-1">Título</label>
                <input type="text" id="postTitle" value={title} onChange={e => setTitle(e.target.value)}
                    className="mt-1 block w-full bg-slate-600 border-slate-500 rounded-md shadow-sm p-2.5 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
            </div>

            <div>
                <label htmlFor="postContent" className="block text-sm font-medium text-slate-300 mb-1">Contenido*</label>
                <textarea id="postContent" value={contentText} onChange={e => setContentText(e.target.value)} rows={8}
                    className="mt-1 block w-full bg-slate-600 border-slate-500 rounded-md shadow-sm p-2.5 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Imagen Destacada</label>
                {currentImageUrl && !imagePreview && (
                    <div className="mb-2 p-2 border border-slate-600 rounded-md bg-slate-600/30">
                        <img src={`${API_BASE_URL}${currentImageUrl}`} alt="Imagen actual" className="max-h-40 rounded border border-slate-500" />
                        <button type="button" onClick={removeCurrentImageHandler} className="mt-1 text-xs text-red-400 hover:text-red-300">Quitar imagen actual</button>
                    </div>
                )}
                 <input 
                    type="file" 
                    id="postImageFile" 
                    accept="image/png, image/jpeg, image/gif" 
                    onChange={handleImageFileChange} 
                    ref={fileInputRef}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-500 cursor-pointer" 
                />
                {imagePreview && (
                    <div className="mt-2 p-2 border border-slate-600 rounded-md bg-slate-600/30">
                        <img src={imagePreview} alt="Previsualización nueva" className="max-h-40 rounded border border-slate-500" />
                         <button type="button" onClick={cancelNewImageSelectionHandler} className="mt-1 text-xs text-orange-400 hover:text-orange-300">Cancelar nueva imagen</button>
                    </div>
                )}
                 {isUploading && <p className="text-xs text-yellow-400 mt-1 animate-pulse">Subiendo imagen...</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="postType" className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                    <select id="postType" value={type} onChange={e => setType(e.target.value as CmsPostTypeEnum)}
                        className="mt-1 block w-full bg-slate-600 border-slate-500 rounded-md shadow-sm p-2.5 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        {Object.values(CmsPostType).map(ptValue => <option key={ptValue} value={ptValue}>{ptValue.charAt(0).toUpperCase() + ptValue.slice(1)}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="postStatus" className="block text-sm font-medium text-slate-300 mb-1">Estado</label>
                    <select id="postStatus" value={status} onChange={e => setStatus(e.target.value as CmsPostStatusEnum)}
                        className="mt-1 block w-full bg-slate-600 border-slate-500 rounded-md shadow-sm p-2.5 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        {Object.values(CmsPostStatus).map(psValue => <option key={psValue} value={psValue}>{psValue.charAt(0).toUpperCase() + psValue.slice(1)}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 mt-2 border-t border-slate-600">
                <button type="button" onClick={onCancel} disabled={isSaving || isUploading}
                    className="py-2 px-4 border border-slate-500 rounded-md shadow-sm text-sm font-medium text-slate-300 hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-800 disabled:opacity-50">
                    Cancelar
                </button>
                <button type="submit" disabled={isSaving || isUploading}
                    className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 focus:ring-offset-slate-800 disabled:opacity-50">
                    {isSaving ? 'Guardando...' : (isUploading ? 'Subiendo...' : (postIdToEdit ? 'Actualizar Post' : 'Crear Post'))}
                </button>
            </div>
        </form>
    );
};

export default PostForm;