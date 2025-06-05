import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../../services/socket.service'; 
import { useAuthStore } from '../../store/auth.store'; 
import type { RoomInfo, RoomJoinSuccessPayload } from '../../types/room.types'; 

interface RoomNavigatorProps {
    isOpen: boolean; 
    onClose: () => void; 
}

type ActiveView = 'all_rooms' | 'my_rooms' | 'create_room';

/**
 * El componente RoomNavigator proporciona una interfaz modal para que los usuarios puedan explorar, crear y unirse a salas de juego.
 * 
 * Funcionalidades:
 * - Muestra una lista de todas las salas disponibles y las salas creadas por el usuario.
 * - Permite a usuarios autenticados crear nuevas salas con un nombre personalizado y límite de jugadores.
 * - Habilita que los usuarios se unan a salas, con actualizaciones en tiempo real mediante eventos de socket.
 * - Maneja estados de carga y mensajes de error para las interacciones con sockets.
 * - Soporta el cambio entre las vistas "Todas las Salas", "Mis Salas" y "Crear Sala".
 * - Requiere autenticación de usuario para acceder a las funcionalidades de las salas.
 * 
 * Props:
 * @param {boolean} isOpen - Controla la visibilidad del modal.
 * @param {() => void} onClose - Función de devolución de llamada para cerrar el modal.
 * 
 * Uso:
 * ```tsx
 * <RoomNavigator isOpen={isRoomNavigatorOpen} onClose={handleCloseRoomNavigator} />
 * ```
 * 
 * Dependencias:
 * - Depende de socketService para la comunicación en tiempo real.
 * - Usa useAuthStore para el estado de autenticación.
 * - Usa useNavigate de React Router para la navegación después de unirse o crear una sala.
 */

const RoomNavigator: React.FC<RoomNavigatorProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();

    const [activeView, setActiveView] = useState<ActiveView>('all_rooms');
    
    const [allRooms, setAllRooms] = useState<RoomInfo[]>([]);
    const [myCreatedRooms, setMyCreatedRooms] = useState<RoomInfo[]>([]);
    
    const [newRoomName, setNewRoomName] = useState<string>('');
    const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState<number>(4); 

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAllRoomList = useCallback(() => {
        if (socketService.socket && socketService.socket.connected) {
            setIsLoading(true);
            console.log("RoomNavigator: Emitiendo get_room_list_request (todas las salas)");
            socketService.emit('get_room_list_request', (response: { rooms?: RoomInfo[] }) => { 
                 setIsLoading(false);
                 if (response.rooms) {
                     setAllRooms(response.rooms);
                 } else {
                     setAllRooms([]);
                 }
            });
        } else {
            setError("Socket no conectado.");
        }
    }, []);

    const fetchMyCreatedRoomList = useCallback(() => {
        if (socketService.socket && socketService.socket.connected) {
            setIsLoading(true);
            console.log("RoomNavigator: Emitiendo rooms:get_my_created");
            socketService.emitGetMyCreatedRooms((response: { success: boolean; rooms?: RoomInfo[]; error?: string }) => {
                setIsLoading(false);
                if (response.success && response.rooms) {
                    setMyCreatedRooms(response.rooms);
                } else {
                    setError(response.error || "Error al cargar mis salas.");
                    setMyCreatedRooms([]);
                }
            });
        } else {
            setError("Socket no conectado.");
        }
    }, []);

    useEffect(() => {
        if (!isOpen || !isAuthenticated) {
            setAllRooms([]);
            setMyCreatedRooms([]);
            setError(null);
            return;
        }

        // Cargar la vista activa
        if (activeView === 'all_rooms') {
            fetchAllRoomList();
        } else if (activeView === 'my_rooms') {
            fetchMyCreatedRoomList();
        }

        const handleRoomListUpdate = (updatedRooms: RoomInfo[]) => { 
            if(activeView === 'all_rooms') { 
                 console.log("RoomNavigator: Recibido room_list_update global", updatedRooms);
                 setAllRooms(updatedRooms);
            }
        };
        const handleRoomCreatedSuccess = (data: RoomJoinSuccessPayload) => {
            setIsLoading(false);
            setError(null);
            onClose(); 
            navigate(`/game/${data.roomId}`);
        };
        const handleJoinRoomSuccess = (data: RoomJoinSuccessPayload) => {
            setIsLoading(false);
            setError(null);
            onClose(); 
            navigate(`/game/${data.roomId}`);
        };
        const handleGameError = (data: { message: string }) => {
            setIsLoading(false);
            setError(data.message);
        };

        socketService.socket?.on('room_list_update', handleRoomListUpdate); 
        socketService.socket?.on('room_created_success', handleRoomCreatedSuccess);
        socketService.socket?.on('join_room_success', handleJoinRoomSuccess);
        socketService.socket?.on('game_error', handleGameError);

        return () => {
            socketService.socket?.off('room_list_update', handleRoomListUpdate);
            socketService.socket?.off('room_created_success', handleRoomCreatedSuccess);
            socketService.socket?.off('join_room_success', handleJoinRoomSuccess);
            socketService.socket?.off('game_error', handleGameError);
        };
    }, [isOpen, isAuthenticated, activeView, fetchAllRoomList, fetchMyCreatedRoomList, onClose, navigate]);

    const handleCreateRoom = () => {
        if (!newRoomName.trim()) {
            setError("El nombre de la sala no puede estar vacío.");
            return;
        }
        if (!socketService.socket || !socketService.socket.connected) {
            setError("No estás conectado al servidor.");
            return;
        }
        setIsLoading(true);
        setError(null);
        socketService.emit('create_room_request', { roomName: newRoomName.trim(), maxPlayers: newRoomMaxPlayers });
        setNewRoomName('');
    };

       const handleJoinRoom = (roomId: string) => {
        if (!socketService.socket || !socketService.socket.connected) {
            setError("No estás conectado al servidor.");
            return;
        }
        setIsLoading(true);
        setError(null);
        console.log(`RoomNavigator: Emitiendo join_room_request para sala ID: ${roomId}`);
        socketService.emit('join_room_request', { roomId });
    };

    const renderRoomList = (rooms: RoomInfo[], isMyRoomsView: boolean) => {
        if (isLoading) return <p className="text-center text-yellow-300 py-4">Cargando salas...</p>;
        if (rooms.length === 0) return <p className="text-center text-slate-400 py-4">No hay salas para mostrar en esta sección.</p>;

        return (
            <ul className="space-y-3 max-h-[calc(100%-50px)] overflow-y-auto pr-2"> 
                {rooms.map((room) => (
                    <li key={room.id} className="p-4 bg-slate-600 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center shadow hover:bg-slate-500 transition-colors">
                        <div className="mb-2 sm:mb-0">
                            <h3 className="text-xl font-medium text-teal-400">{room.name}</h3>
                            <p className="text-sm text-slate-300">
                                Jugadores: {room.playerCount} / {room.maxPlayers}
                            </p>
                        </div>
                        <button
                            onClick={() => handleJoinRoom(room.id)}
                            disabled={isLoading || room.playerCount >= room.maxPlayers && room.status !== 'waiting'}
                            className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                        >
                            {isMyRoomsView && room.status === 'waiting' ? 'Entrar (Host)' : (room.status === 'in-game' ? 'En Juego' : 'Unirse')}
                        </button>
                    </li>
                ))}
            </ul>
        );
    };

    const renderCreateRoomView = () => (
        <div className="p-4">
            <h2 className="text-2xl font-semibold mb-6 text-teal-300 text-center">Crear Nueva Sala</h2>
            <div className="space-y-4 max-w-md mx-auto">
                <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Nombre de la sala"
                    className="w-full p-3 rounded bg-slate-600 border border-slate-500 focus:ring-teal-500 focus:border-teal-500 placeholder-slate-400"
                    disabled={isLoading}
                />
                <div>
                    <label htmlFor="maxPlayers" className="block text-sm font-medium text-slate-300 mb-1">Máximo de jugadores:</label>
                    <select 
                        id="maxPlayers"
                        value={newRoomMaxPlayers} 
                        onChange={(e) => setNewRoomMaxPlayers(parseInt(e.target.value,10))}
                        className="w-full p-3 rounded bg-slate-600 border border-slate-500 focus:ring-teal-500 focus:border-teal-500"
                    >
                        {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
                <button
                    onClick={handleCreateRoom}
                    disabled={isLoading || !newRoomName.trim()}
                    className="w-full bg-teal-500 hover:bg-teal-600 px-6 py-3 rounded-md font-semibold text-lg disabled:opacity-50"
                >
                    Crear Sala
                </button>
            </div>
        </div>
    );


    if (!isOpen) return null;
    if (!isAuthenticated && !isLoading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] p-4">
                <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center">
                    <p className="text-red-400 text-lg mb-4">Debes estar autenticado para ver o crear salas.</p>
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded">Cerrar</button>
                </div>
            </div>
        );
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100] p-4 backdrop-blur-sm"> {/* Aumentado z-index */}
            <div className="bg-slate-800 text-white p-1 md:p-6 rounded-lg shadow-xl w-full max-w-3xl h-[80vh] md:h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-1 md:mb-4 px-4 pt-4 md:px-0 md:pt-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-sky-400">Navegador de Salas</h1>
                    <button onClick={onClose} className="text-red-500 hover:text-red-400 text-3xl font-bold">&times;</button>
                </div>

                {error && <p className="text-red-400 bg-red-900 p-3 rounded-md mx-4 md:mx-0 mb-3 text-center">{error}</p>}
                <div className="flex border-b border-slate-700 mb-1 md:mb-4 px-4 md:px-0">
                    {(['all_rooms', 'my_rooms', 'create_room'] as ActiveView[]).map(view => (
                        <button
                            key={view}
                            onClick={() => { setActiveView(view); setError(null); }}
                            className={`py-2 px-2 md:px-4 text-sm md:text-base font-medium focus:outline-none transition-colors
                                ${activeView === view 
                                    ? 'border-b-2 border-sky-400 text-sky-300' 
                                    : 'text-slate-400 hover:text-sky-300'}`}
                        >
                            {view === 'all_rooms' ? 'Todas las Salas' : view === 'my_rooms' ? 'Mis Salas' : 'Crear Sala'}
                        </button>
                    ))}
                     <button
                        onClick={() => { 
                            if (activeView === 'all_rooms') fetchAllRoomList();
                            else if (activeView === 'my_rooms') fetchMyCreatedRoomList();
                        }}
                        className="ml-auto py-2 px-2 md:px-4 text-sm text-slate-400 hover:text-sky-300"
                        title="Refrescar lista"
                    >
                        🔄
                    </button>
                </div>
                <div className="flex-grow overflow-hidden px-1 md:px-0"> 
                    {activeView === 'all_rooms' && renderRoomList(allRooms, false)}
                    {activeView === 'my_rooms' && renderRoomList(myCreatedRooms, true)}
                    {activeView === 'create_room' && renderCreateRoomView()}
                </div>
            </div>
        </div>
    );
};

export default RoomNavigator;