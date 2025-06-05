import React, { useState, useRef } from 'react';
import { gameApiService } from '../../../services/feed.service';
import { cmsApiService } from '../../../services/cms.service';

interface CreateTweetFormProps {
  /**
   * Callback opcional que se ejecuta después de crear el post.
   */
  onPostCreated?: () => void;
}

const MAX_TWEET_LENGTH = 280;

/**
 * Formulario para crear un nuevo tweet/post, permitiendo texto e imagen.
 * Sube la imagen al CMS antes de publicar el post.
 *
 * @component
 * @param {CreateTweetFormProps} props - Propiedades del componente.
 * @returns {JSX.Element} El formulario de creación de tweet.
 */
const CreateTweetForm: React.FC<CreateTweetFormProps> = ({ onPostCreated }) => {
  const [contentText, setContentText] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen es demasiado grande (máximo 5MB).");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
    }
    if (event.target) event.target.value = "";
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const cancelImageSelection = () => {
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = contentText.trim();
    if (!text && !selectedImageFile) {
      setError("Escribe algo o selecciona una imagen.");
      return;
    }
    if (text.length > MAX_TWEET_LENGTH) {
      setError(`El mensaje no puede exceder los ${MAX_TWEET_LENGTH} caracteres.`);
      return;
    }

    setIsPosting(true);
    setError(null);
    let finalImageUrl: string | null = null;

    if (selectedImageFile) {
      setIsUploading(true);
      try {
        const uploadResult = await cmsApiService.uploadPostImage(selectedImageFile);
        if (uploadResult.success && uploadResult.imageUrl) {
          finalImageUrl = uploadResult.imageUrl;
        } else {
          throw new Error(uploadResult.message || "Fallo al subir la imagen.");
        }
      } catch (uploadErr: any) {
        setError(uploadErr.message);
        setIsUploading(false);
        setIsPosting(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    try {
      await gameApiService.createPlayerPost(text, finalImageUrl);
      setContentText('');
      cancelImageSelection();
      setError(null);
      onPostCreated?.();
    } catch (postErr: any) {
      setError(postErr.message || "Error al publicar el tweet.");
    } finally {
      setIsPosting(false);
    }
  };

  const charsLeft = MAX_TWEET_LENGTH - contentText.length;

  return (
    <div className="bg-slate-800/90 p-6 rounded-2xl shadow-xl mb-10 max-w-2xl mx-auto backdrop-blur-md border border-slate-700">
      <h3 className="text-xl font-bold text-white mb-4">Comparte tus pensamientos</h3>

      {error && (
        <p className="text-sm text-red-400 bg-red-900/30 p-3 rounded-md mb-4 border border-red-700">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          value={contentText}
          onChange={(e) => setContentText(e.target.value)}
          rows={4}
          placeholder="¿Qué tienes en mente?"
          className="w-full p-3 rounded-lg text-white bg-slate-700/70 border border-slate-600 placeholder-slate-400 text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
          maxLength={MAX_TWEET_LENGTH}
        />

        <div className="text-xs text-right mt-1 text-slate-400">
          {charsLeft < 0 ? (
            <span className="text-red-500">{charsLeft}</span>
          ) : (
            charsLeft
          )}{" "}
          / {MAX_TWEET_LENGTH}
        </div>

        {imagePreviewUrl && (
          <div className="mt-3 relative w-fit">
            <img
              src={imagePreviewUrl}
              alt="Previsualización"
              className="max-h-40 rounded-lg border border-slate-600 shadow-md"
            />
            <button
              type="button"
              onClick={cancelImageSelection}
              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow"
              title="Quitar imagen"
            >
              &times;
            </button>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={isPosting || isUploading}
              className="flex items-center space-x-1 text-slate-400 hover:text-teal-400 transition-colors text-sm disabled:opacity-40"
              title="Adjuntar imagen"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 
                  1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 
                  0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"
                />
              </svg>
              <span>Imagen</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageFileChange}
              accept="image/png, image/jpeg, image/gif"
              className="hidden"
              disabled={isPosting || isUploading}
            />
          </div>

          <button
            type="submit"
            disabled={
              isPosting ||
              isUploading ||
              (!contentText.trim() && !selectedImageFile) ||
              contentText.length > MAX_TWEET_LENGTH
            }
            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-5 rounded-full text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Subiendo..." : isPosting ? "Posteando..." : "Postear"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTweetForm;