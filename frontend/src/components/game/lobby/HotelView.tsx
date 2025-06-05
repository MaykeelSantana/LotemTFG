import React from 'react';

interface HotelViewProps {
    onOpenCatalog: () => void;
    onOpenInventory: () => void;
    onOpenRoomNavigator: () => void;
    onOpenFriends: () => void;
    username?: string;
}

/**
 * El componente HotelView muestra la interfaz principal del lobby del "hotel" (juego referencia a Habbo Hotel), dando la bienvenida al usuario
 * y proporcionando opciones de navegación a diferentes secciones como salas, tienda, inventario y lista de amigos.
 *
 * @param onOpenCatalog - Función de devolución de llamada que se ejecuta cuando se hace clic en el botón "Tienda".
 * @param onOpenInventory - Función de devolución de llamada que se ejecuta cuando se hace clic en el botón "Inventario".
 * @param onOpenRoomNavigator - Función de devolución de llamada que se ejecuta cuando se hace clic en el botón "Ir a Salas".
 * @param onOpenFriends - Función de devolución de llamada que se ejecuta cuando se hace clic en el botón "Mis Amigos".
 * @param username - Nombre de usuario del usuario actual, mostrado en el mensaje de bienvenida si está disponible.
 *
 * @returns La vista del lobby del hotel con botones de navegación y un mensaje de bienvenida personalizado.
 */

const HotelView: React.FC<HotelViewProps> = ({
    onOpenCatalog,
    onOpenInventory,
    onOpenRoomNavigator,
    onOpenFriends,
    username
}) => {
    return (
        <div
            className="w-screen h-screen flex items-center justify-center relative"
            style={{
                backgroundImage: "url('/assets/backgrounds/bg_lobby.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm" />

            <div className="relative z-10 text-center p-10 rounded-3xl shadow-2xl border border-slate-600 bg-slate-800/60 backdrop-blur-xl max-w-4xl w-full mx-4">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                    Bienvenido a <span className="text-sky-400">Lotem</span>
                </h1>
                {username && (
                    <p className="text-xl text-slate-300 mb-6">
                        ¡Hola, <span className="font-semibold">{username}</span>!
                    </p>
                )}
                <p className="text-slate-400 mb-8 text-lg">
                    ¿Qué te gustaría hacer hoy?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <HotelButton color="teal" icon="🚪" label="Ir a Salas" onClick={onOpenRoomNavigator} />
                    <HotelButton color="sky" icon="🛍️" label="Tienda" onClick={onOpenCatalog} />
                    <HotelButton color="lime" icon="🎒" label="Inventario" onClick={onOpenInventory} />
                    <HotelButton color="rose" icon="👩🏼‍🤝‍🧑🏼" label="Mis Amigos" onClick={onOpenFriends} />
                </div>
            </div>
        </div>
    );
};

interface HotelButtonProps {
    label: string;
    icon: string;
    onClick: () => void;
    color: 'teal' | 'sky' | 'lime' | 'rose';
}

const HotelButton: React.FC<HotelButtonProps> = ({ label, icon, onClick, color }) => {
    const baseColor = {
        teal: 'bg-teal-500 hover:bg-teal-600',
        sky: 'bg-sky-500 hover:bg-sky-600',
        lime: 'bg-lime-500 hover:bg-lime-600',
        rose: 'bg-rose-500 hover:bg-rose-600',
    }[color];

    return (
        <button
            onClick={onClick}
            className={`${baseColor} text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 text-lg`}
        >
            <span className="block text-2xl mb-1">{icon}</span>
            {label}
        </button>
    );
};

export default HotelView;
