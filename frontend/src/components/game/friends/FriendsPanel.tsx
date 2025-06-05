import React, { useEffect, useState, useCallback } from 'react';
import { socketService } from '../../../services/socket.service';
import { useAuthStore } from '../../../store/auth.store';
import type { Friend, FriendRequestInfo } from '../../../types/friend.types'; 
import PrivateChatWindow from './PrivateChatWindow';

type ActiveTab = 'friends' | 'received' | 'sent' | 'add';


/**
 * Representa una solicitud de amistad pendiente tal como la devuelve el backend.
 *
 * @property id - El identificador único de la solicitud de amistad.
 * @property status - El estado actual de la solicitud de amistad (por ejemplo: "pendiente", "aceptada", "rechazada").
 * @property otherUser - Información sobre el otro usuario involucrado en la solicitud de amistad.
 * @property otherUser.id - El identificador único del otro usuario.
 * @property otherUser.username - El nombre de usuario del otro usuario.
 * @property createdAt - La marca de tiempo ISO que indica cuándo se creó la solicitud.
 */

interface BackendPendingRequest {
    id: string; 
    status: string;
    otherUser: { 
        id: string;
        username: string;
    };
    createdAt: string;
}
/**
 * Representa un objeto de amigo tal como se recibe desde el backend.
 *
 * @property id - El identificador único del amigo.
 * @property username - El nombre de usuario del amigo.
 * @property friendshipId - (Opcional) El identificador único de la relación de amistad, si está disponible.
 */
interface BackendFriend {
    id: string; 
    username: string;
    friendshipId?: string; 
}
/**
 * Propiedades (props) para el componente FriendsPanel.
 *
 * @property isOpen - Indica si el panel de amigos está abierto actualmente.
 * @property onClose - Función de devolución de llamada que se invoca cuando se solicita cerrar el panel.
 * @property onOpenChat - Función de devolución de llamada que se invoca cuando se solicita abrir un chat con un amigo.
 *   Recibe el objeto `Friend` seleccionado como argumento.
 */

interface FriendsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenChat: (friend: Friend) => void;
}


/**
 * El componente FriendsPanel muestra y gestiona la lista de amigos del usuario, solicitudes de amistad e interacciones con amigos.
 *
 * Este panel permite a los usuarios:
 * - Ver sus amigos actuales.
 * - Enviar nuevas solicitudes de amistad por nombre de usuario.
 * - Ver y responder a las solicitudes de amistad recibidas (aceptar o rechazar).
 * - Ver las solicitudes de amistad enviadas.
 * - Eliminar amigos de su lista.
 * - Abrir una ventana de chat con un amigo.
 *
 * El componente se comunica con el backend a través de un servicio de sockets para obtener y actualizar en tiempo real los amigos y las solicitudes.
 * Proporciona mensajes de retroalimentación para las acciones del usuario y gestiona estados de carga y error.
 *
 * @component
 * @param {FriendsPanelProps} props - Las propiedades del componente FriendsPanel.
 * @param {boolean} props.isOpen - Indica si el panel de amigos está abierto.
 * @param {() => void} props.onClose - Función de devolución de llamada para cerrar el panel.
 * @param {(friend: Friend) => void} props.onOpenChat - Función de devolución de llamada para abrir un chat con un amigo seleccionado.
 *
 * @example
 * <FriendsPanel
 *   isOpen={isFriendsPanelOpen}
 *   onClose={handleCloseFriendsPanel}
 *   onOpenChat={handleOpenChatWithFriend}
 * />
 */

const FriendsPanel: React.FC<FriendsPanelProps> = ({ isOpen, onClose, onOpenChat }) => {
    const currentUser = useAuthStore(state => state.user);

    const [friendsList, setFriendsList] = useState<Friend[]>([]);
    const [pendingReceivedRequests, setPendingReceivedRequests] = useState<FriendRequestInfo[]>([]);
    const [pendingSentRequests, setPendingSentRequests] = useState<FriendRequestInfo[]>([]);
    
    const [addFriendUsername, setAddFriendUsername] = useState('');
    const [activeTab, setActiveTab] = useState<ActiveTab>('friends');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
    const [activeChatFriend, setActiveChatFriend] = useState<Friend | null>(null);

    /**
     * Abre la ventana de chat con un amigo.
     * @param {Friend} friendToChatWith Información del amigo con el que se quiere abrir el chat.
     */
    const openChatWithFriend = (friendToChatWith: Friend) => {
    console.log("Abriendo chat con:", friendToChatWith.username);
    setActiveChatFriend(friendToChatWith);
    };

    const closeChatWindow = () => {
        setActiveChatFriend(null);
    };

    /**
     * Muestra un mensaje de retroalimentación (feedback) en el panel de amigos.
     * @param {string} text Texto a mostrar.
     * @param {'success'|'error'} [type='success'] Tipo de feedback (exitoso o error).
     */
    const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
        setFeedbackMessage({ text, type });
        setTimeout(() => setFeedbackMessage(null), 4000);
    };

    const fetchData = useCallback(() => {
        if (!currentUser?.id || !socketService.socket?.connected) {
            setError("No conectado o usuario no disponible.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        let pendingRequestsDone = false;
        let friendsListDone = false;
        const checkLoadingDone = () => {
            if (pendingRequestsDone && friendsListDone) setIsLoading(false);
        }

        // Obtener lista de amigos
        socketService.socket.emit('friends:get_list', (response: { success: boolean; friends?: BackendFriend[]; error?: string }) => {
            if (response.success && response.friends) {
                const mappedFriends: Friend[] = response.friends.map(f => ({
                    id: f.id, 
                    username: f.username,
                    friendshipId: f.friendshipId || f.id, // Asumir que el ID de la amistad es necesario para eliminar
                }));
                setFriendsList(mappedFriends);
            } else {
                setError(prev => prev ? `${prev}\n${response.error}` : response.error || "Error obteniendo lista de amigos.");
                setFriendsList([]);
            }
            friendsListDone = true;
            checkLoadingDone();
        });

        // Obtener solicitudes pendientes
        socketService.socket.emit('friends:get_pending_requests', (response: { success: boolean; sent?: BackendPendingRequest[]; received?: BackendPendingRequest[]; error?: string }) => {
            if (response.success) {
                setPendingSentRequests(response.sent?.map(req => ({
                    id: req.id,
                    otherUserId: req.otherUser.id,
                    otherUsername: req.otherUser.username,
                    createdAt: req.createdAt,
                })) || []);
                setPendingReceivedRequests(response.received?.map(req => ({
                    id: req.id,
                    otherUserId: req.otherUser.id,
                    otherUsername: req.otherUser.username,
                    createdAt: req.createdAt,
                })) || []);
            } else {
                setError(prev => prev ? `${prev}\n${response.error}` : response.error || "Error obteniendo solicitudes.");
                setPendingSentRequests([]);
                setPendingReceivedRequests([]);
            }
            pendingRequestsDone = true;
            checkLoadingDone();
        });
    }, [currentUser?.id]);

    useEffect(() => {
        if (isOpen && currentUser?.id) {
            fetchData();

            const handleNewRequestReceived = (data: { friendshipId: string; senderUsername: string; senderId: string }) => {
                showFeedback(`Nueva solicitud de amistad de ${data.senderUsername}`, 'success');
                fetchData();
            };
            const handleRequestResponse = (data: { friendship?: {id:string, user1?:any, user2?:any, requestedBy?:any}; friendUsername?: string, message?: string}) => {
                showFeedback(data.message || `Respuesta a solicitud procesada.`, 'success');
                fetchData();
            };
             const handleFriendRemoved = (data: { removerUsername?: string, message?: string }) => {
                showFeedback(data.message || `Amistad con ${data.removerUsername} terminada.`, 'success');
                fetchData();
            };
            const handleListUpdated = () => { fetchData(); };

            socketService.socket?.on('friends:new_request_received', handleNewRequestReceived);
            socketService.socket?.on('friends:request_accepted', handleRequestResponse);
            socketService.socket?.on('friends:request_declined', handleRequestResponse);
            socketService.socket?.on('friends:friend_removed', handleFriendRemoved);
            socketService.socket?.on('friends:list_updated', handleListUpdated);

            return () => {
                socketService.socket?.off('friends:new_request_received', handleNewRequestReceived);
                socketService.socket?.off('friends:request_accepted', handleRequestResponse);
                socketService.socket?.off('friends:request_declined', handleRequestResponse);
                socketService.socket?.off('friends:friend_removed', handleFriendRemoved);
                socketService.socket?.off('friends:list_updated', handleListUpdated);
            };
        } else if (!isOpen) {
            setFriendsList([]); setPendingReceivedRequests([]); setPendingSentRequests([]);
            setError(null); setIsLoading(false); setAddFriendUsername('');
        }
    }, [isOpen, currentUser?.id, fetchData]);

    /**
     * Handler para el formulario de agregar amigo.
     * @param {React.FormEvent} e - Evento de env o del formulario.
     * Env a una solicitud de amistad al servidor y actualiza las solicitudes enviadas.
     */
    const handleSendFriendRequest = (e: React.FormEvent) => {
        e.preventDefault();
        const usernameToAd = addFriendUsername.trim();
        if (!usernameToAd || !socketService.socket?.connected) return;
        if (usernameToAd.toLowerCase() === currentUser?.username.toLowerCase()) {
            showFeedback("No puedes agregarte a ti mismo.", "error");
            return;
        }

        setFeedbackMessage({text: `Enviando solicitud a ${usernameToAd}...`, type: 'success'});
        socketService.socket.emit('friends:send_request', { receiverUsername: usernameToAd }, (response: { success: boolean; message?: string }) => {
            showFeedback(response.message || (response.success ? 'Solicitud enviada.' : 'Error al enviar.'), response.success ? 'success' : 'error');
            if (response.success) {
                setAddFriendUsername('');
                fetchData(); // Actualizar solicitudes enviadas
            }
        });
    };

    /**
     * Handler para responder a una solicitud de amistad.
     * @param {string} friendshipId - ID de la solicitud de amistad.
     * @param {'accept'|'decline'} action - Acci n a realizar con la solicitud (aceptar o rechazar).
     * Env a una respuesta a la solicitud de amistad al servidor y actualiza la lista de amigos.
     */
    const handleRespondToRequest = (friendshipId: string, action: 'accept' | 'decline') => {
        if (!socketService.socket?.connected) return;
        setFeedbackMessage({text: `Procesando...`, type: 'success'});
        socketService.socket.emit('friends:respond_request', { friendshipId, action }, (response: { success: boolean; message?: string }) => {
            showFeedback(response.message || 'Respuesta procesada.', response.success ? 'success' : 'error');
            if (response.success) fetchData();
        });
    };
    

        /**
         * Elimina un amigo de la lista de amigos del usuario actual.
         * @param {string} friendUserId - ID del usuario a eliminar.
         * @param {string} friendUsername - Username del usuario a eliminar.
         */
    const handleRemoveFriend = (friendUserId: string, friendUsername: string) => {
        if (!socketService.socket?.connected) return;
        if (window.confirm(`¿Estás seguro de que quieres eliminar a ${friendUsername} de tu lista de amigos?`)) {
            setFeedbackMessage({text: `Eliminando a ${friendUsername}...`, type: 'success'});
            socketService.socket.emit('friends:remove_friend', { friendUserId }, (response: { success: boolean; message?: string }) => {
                showFeedback(response.message || 'Amigo eliminado.', response.success ? 'success' : 'error');
                if (response.success) fetchData();
            });
        }
    };
    /**
     * Renderiza el contenido del panel de amigos según la pestaña activa.
     * Muestra una lista de amigos, solicitudes de amistad recibidas, solicitudes de amistad enviadas o un formulario para enviar una nueva solicitud de amistad.
     * @returns {JSX.Element}
     */

    const renderTabContent = () => {
        if (isLoading && friendsList.length === 0 && pendingReceivedRequests.length === 0 && pendingSentRequests.length === 0) {
            return <p className="text-center text-slate-400 py-4">Cargando datos de amigos...</p>;
        }

        switch (activeTab) {
            case 'friends':
                return friendsList.length > 0 ? (
                    <ul className="space-y-2">
                        {friendsList.map(friend => (
                            <li key={friend.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                                <span className="text-slate-100">{friend.username}</span>
                                <div>
                               
                                    <button 
                                        className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-2 py-1 rounded mr-1" 
                                        onClick={() => onOpenChat(friend)} 
                                    >
                                        Chat
                                    </button>
                                    <button 
                                        className="bg-red-600 hover:bg-red-500 text-white text-xs px-2 py-1 rounded" 
                                        onClick={() => handleRemoveFriend(friend.id, friend.username)}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-slate-400 text-center py-4">No tienes amigos aún. ¡Añade algunos!</p>;
            case 'received':
                return pendingReceivedRequests.length > 0 ? (
                    <ul className="space-y-2">
                        {pendingReceivedRequests.map(req => (
                            <li key={req.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                                <span className="text-slate-100">De: {req.otherUsername}</span>
                                <div>
                                    <button className="bg-green-500 hover:bg-green-400 text-white text-xs px-2 py-1 rounded mr-1" onClick={() => handleRespondToRequest(req.id, 'accept')}>Aceptar</button>
                                    <button className="bg-orange-500 hover:bg-orange-400 text-white text-xs px-2 py-1 rounded" onClick={() => handleRespondToRequest(req.id, 'decline')}>Rechazar</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-slate-400 text-center py-4">No tienes solicitudes de amistad recibidas.</p>;
            case 'sent':
                return pendingSentRequests.length > 0 ? (
                    <ul className="space-y-2">
                        {pendingSentRequests.map(req => (
                            <li key={req.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                                <span className="text-slate-100">A: {req.otherUsername}</span>
                                <span className="text-xs text-slate-500">Pendiente</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-slate-400 text-center py-4">No tienes solicitudes de amistad enviadas.</p>;
            case 'add':
                return (
                    <form onSubmit={handleSendFriendRequest} className="space-y-3">
                        <div>
                            <label htmlFor="addFriendUsername" className="block text-sm font-medium text-slate-300 mb-1">Nombre de Usuario:</label>
                            <input
                                type="text"
                                id="addFriendUsername"
                                value={addFriendUsername}
                                onChange={(e) => setAddFriendUsername(e.target.value)}
                                placeholder="Escribe el nombre del usuario"
                                className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-400 px-3 py-2 rounded-md focus:ring-teal-500 focus:border-teal-500"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md transition-colors">
                            Enviar Solicitud de Amistad
                        </button>
                    </form>
                );
            default: return null;
        }
    };

    if (!isOpen) return null;
return (
        <>
        {isOpen && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-[70] p-6 transition-opacity duration-300"
            role="dialog"
            aria-modal="true"
            aria-labelledby="friends-panel-title"
        >
            <div 
            className="bg-slate-900 text-white p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
            style={{animation: 'slideDownFade 0.3s ease forwards'}}
            >
            <div className="flex justify-between items-center mb-5">
                <h2 id="friends-panel-title" className="text-3xl font-extrabold text-teal-400 tracking-wide">
                Amigos
                </h2>
                <button 
                onClick={onClose} 
                className="text-red-500 hover:text-red-400 text-4xl font-extrabold leading-none transition-transform hover:rotate-90 focus:outline-none"
                aria-label="Cerrar panel de amigos"
                >
                &times;
                </button>
            </div>

            {feedbackMessage && (
                <p className={`text-center p-3 rounded-md mb-4 text-sm font-semibold
                ${feedbackMessage.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-900 text-red-300'}`}>
                {feedbackMessage.text}
                </p>
            )}

            {error && (
                <p className="text-center text-red-300 bg-red-800/60 p-3 rounded-md mb-4 text-sm font-medium shadow-inner">
                Error: {error}
                </p>
            )}

            <nav className="flex border-b border-slate-700 mb-5 space-x-3" aria-label="Tabs">
                {(['friends', 'received', 'sent', 'add'] as ActiveTab[]).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap py-3 px-4 text-sm font-semibold rounded-t-lg transition-colors
                    ${activeTab === tab
                        ? 'bg-teal-700 text-teal-300 border-b-4 border-teal-500 shadow-md'
                        : 'text-slate-400 hover:text-teal-400 hover:border-teal-500 border-b-4 border-transparent'}`}
                    role="tab"
                    aria-selected={activeTab === tab}
                    tabIndex={activeTab === tab ? 0 : -1}
                >
                    {tab === 'friends' ? 'Mis Amigos' :
                    tab === 'received' ? `Recibidas (${pendingReceivedRequests.length})` :
                    tab === 'sent' ? `Enviadas (${pendingSentRequests.length})` : 'Añadir'}
                </button>
                ))}
            </nav>

            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                {renderTabContent()}
            </div>
            </div>

                <style>{`
                @keyframes slideDownFade {
                    0% {opacity: 0; transform: translateY(-20px);}
                    100% {opacity: 1; transform: translateY(0);}
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #2dd4bf; /* teal-400 */
                    border-radius: 3px;
                }
                `}</style>
            </div>
            )}  
</>);};

export default FriendsPanel;