import React from 'react';
import PostFeedDisplay from '../components/ui/posts/PostFeedDisplay'; 
import { CmsPostType } from '../types/cms.types'; 

/**
 * Página que muestra el feed de noticias del juego.
 * Muestra un listado de posts de tipo NEWS, UPDATE o EVENT.
 * Permite paginar y mostrar hasta 5 posts por página.
 * El feed se renderiza en una sola columna sin título.
 * 
 * @component
 * @example
 * <GameNewsPage />
 */
const GameNewsPage: React.FC = () => {
    return (
        <div className="container mx-auto py-8">
            <PostFeedDisplay 
                feedTitle=""
                postTypesFilter={[CmsPostType.NEWS, CmsPostType.UPDATE, CmsPostType.EVENT]} 
                defaultItemsPerPage={5} 
                className="game-news-feed" 
            />
        </div>
    );
};

export default GameNewsPage;