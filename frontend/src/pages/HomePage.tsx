import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DraggableSticker from '../components/ui/DraggableSticker';
import PostFeedDisplay from '..//components/ui/posts/PostFeedDisplay'; 
import { CmsPostType } from '../types/cms.types';
import AdminPostManagementPage from '../components/ui/posts/AdminPostManagementPage';
const tabs = [
  {
    id: 'social',
    label: 'Comunidad',
    description:
      'Conéctate con miles de usuarios en espacios virtuales interactivos. Chatea, forma grupos y crea amistades duraderas.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M15 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'creacion',
    label: 'Creación',
    description:
      'Construye y personaliza tus propios espacios virtuales con herramientas fáciles de usar. Diseña desde tu habitación hasta toda una ciudad.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.01" />
      </svg>
    ),
  },
  {
    id: 'aventura',
    label: 'Aventura',
    description:
      'Explora eventos, misiones y mundos secretos. Vive experiencias únicas que solo este universo virtual puede ofrecer.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-1.588a2 2 0 10-1.54-3.774L12 6l-6-2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12v8h6v-8" />
      </svg>
    ),
  },
];

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const currentTab = tabs.find((tab) => tab.id === activeTab)!;

  return (
    <main className="w-full text-gray-100 bg-black">
      <section className="relative w-full h-[70vh] flex items-center justify-center">
              <video
                className="absolute inset-0 w-full h-full object-cover brightness-50"
                autoPlay
                loop
                muted
                playsInline
                src="../assets/video/herovideo.mp4"
              />
              <div className="absolute inset-0 bg-black/60" />
                <div className="relative z-10 text-center px-6 md:px-12 mt-12 md:mt-[25rem]">
                          <h1 className="text-5xl md:text-7xl font-extralight mb-4 tracking-wide drop-shadow-lg">
                  <span className="font-museo font-black text-white-400">Una aventura pixeleada</span>
                </h1>
              <p className="text-lg md:text-xl text-gray-300 drop-shadow max-w-2xl mx-auto">
                Donde la creatividad, comunidad y aventura convergen en un universo único.
              </p>
            </div>
          </section>

      <section className="relative py-20 px-6 md:px-12 text-center bg-black">
        <div className="flex justify-center space-x-8 mb-12 border-b border-gray-700">
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-2 pb-4 text-sm md:text-base transition-colors ${
                activeTab === id
                  ? 'border-b-4 border-teal-400 text-teal-400 font-semibold'
                  : 'text-gray-400 hover:text-teal-300'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto text-gray-300 text-lg md:text-xl"
          >
            {currentTab.description}
          </motion.div>
        </AnimatePresence>
      </section>
<section className="relative w-full min-h-[60vh]  flex items-center justify-center px-8 md:px-24"   style={{ backgroundColor: '#efedff' }}
>
  <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-7xl gap-12">
    <div className="flex-1 flex justify-center">
      <img
      
        src="https://cdn.highrisegame.com/web/assets/images/landing/dress-up-items.webp"
        alt="Sticker"
        className="w-3/4 max-w-md"
      />
    </div>
    <div className="flex-1 text-right">
        <DraggableSticker
        imageUrl="../assets/c_images/octopus.svg"
        size={200}
        initialPosition={{ x: '80vw', y: '60vh' }}
      />
      <DraggableSticker
        imageUrl="../assets/c_images/ice.svg"
        size={310}
        initialPosition={{ x: '30vw', y: '60vh' }}
      />
         <DraggableSticker
        imageUrl="../assets/c_images/lollipop.svg"
        size={350}
        initialPosition={{ x: '20vw', y: '20vh' }}
      />
         <DraggableSticker
        imageUrl="../assets/c_images/pizza.svg"
        size={220}
        initialPosition={{ x: '75vw', y: '5vh' }}
      />
      <h2 className="font-museo text-black text-5xl font-bold mb-4">Explora. Crea. Comparte.</h2>
      <p className="font-museo text-black  text-2xl max-w-xl ml-auto text-homepage">
        Sumérgete en una experiencia social envolvente donde tú eres el protagonista. Descubre herramientas para diseñar tu mundo ideal y compartirlo con otros.
      </p>
    </div>
  </div>
</section>

<section className="relative w-full min-h-[60vh] bg-gray-100 flex items-center justify-center px-8 md:px-24" style={{ backgroundColor: '#dad8ec' }}>
  <div className="flex flex-col md:flex-row-reverse items-center justify-between w-full max-w-7xl gap-12">
    <div className="flex-1 flex justify-center">
      <img
        src="../assets/c_images/banner2.webp"
        alt="Personaje"
        className="w-3/4 max-w-md"
      />
    </div>
    <div className="flex-1 text-left">
          <DraggableSticker
        imageUrl="../assets/c_images/cat3d.svg"
        size={200}
        initialPosition={{ x: '80vw', y: '60vh' }}
      />
      <DraggableSticker
        imageUrl="../assets/c_images/shark.svg"
        size={350}
        initialPosition={{ x: '30vw', y: '60vh' }}
      />
      
      <h2 className="font-museo text-black text-5xl font-bold mb-4">Eventos en Tiempo Real</h2>
      <p className="font-museo text-black  text-2xl max-w-xl ml-auto text-homepage">
        Participa en desafíos globales, shows en vivo y actividades exclusivas con recompensas únicas. ¡Conéctate y sé parte del momento!
      </p>
    </div>
  </div>
</section>

<section className="relative w-full min-h-[60vh]  flex items-center justify-center px-8 md:px-24"   style={{ backgroundColor: '#efedff' }}>
  <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-7xl gap-12">
    <div className="flex-1 flex justify-center">
      <img
        src="../assets/c_images/banner3.png"
        alt="Sticker"
        className="w-3/4 max-w-md"
      />
    </div>
    <div className="flex-1 text-right">
           <DraggableSticker
        imageUrl="../assets/c_images/ice.svg"
        size={220}
        initialPosition={{ x: '80vw', y: '60vh' }}
      />
      <DraggableSticker
        imageUrl="../assets/c_images/crystal.svg"
        size={200}
        initialPosition={{ x: '30vw', y: '60vh' }}
      />
      <h2 className="font-museo text-black text-5xl font-bold mb-4">Crea tu Universo</h2>
      <p className="font-museo text-black  text-2xl max-w-xl ml-auto text-homepage">
        Personaliza tu espacio, invita a tus amigos y conviértete en el diseñador de tu propia historia.
      </p>
    </div>
  </div>
</section>
 <div className="relative w-full mx-auto py-8" style={{ backgroundColor: '#000' }}>
   <PostFeedDisplay 
                feedTitle="NOTICIAS"
                postTypesFilter={[CmsPostType.NEWS, CmsPostType.UPDATE, CmsPostType.EVENT]} 
                defaultItemsPerPage={5} 
                className="game-news-feed"
            /></div>      
    </main>
  );
};

export default HomePage;
