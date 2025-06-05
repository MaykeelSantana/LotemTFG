// frontend/src/pages/SocialFeedPage.tsx
import React, { useEffect, useState } from 'react';
import PostFeedDisplay from '..//components/ui/posts/PostFeedDisplay'; 
import { CmsPostType } from '../types/cms.types'; 
import CreateTweetForm from '../components/ui/posts/CreateTweetForm';

const SocialFeedPage: React.FC = () => {
const [refreshFeedFlag, setRefreshFeedFlag] = useState(0);
    const handlePostCreated = () => {
        setRefreshFeedFlag(prev => prev + 1);
    };
    return (
        <div className="relative w-full container mx-auto py-8">
        <h2 className="font-museo text-center text-white text-3xl font-bold mb-4">Dime, ¿qué piensas hoy?</h2>
         <CreateTweetForm onPostCreated={handlePostCreated} />
            <PostFeedDisplay 
                feedTitle=""
                postTypesFilter={[CmsPostType.TWEET]} 
                defaultItemsPerPage={10} 
                className="social-feed" 
            />
        </div>
    );
};

export default SocialFeedPage;