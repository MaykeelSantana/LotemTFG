import React, { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../../../services/socket.service';
import { useAuthStore } from '../../../store/auth.store';
import type { Friend } from '../../../types/friend.types'; 

/**
 * Representa un mensaje de chat intercambiado entre amigos en la ventana de chat privado.
 *
 * @property id - Identificador único del mensaje.
 * @property friendshipId - (Opcional) Identificador de la relación de amistad a la que pertenece este mensaje.
 * @property senderId - ID del usuario que envió el mensaje.
 * @property senderUsername - Nombre de usuario del remitente.
 * @property receiverId - ID del usuario que recibe el mensaje.
 * @property messageText - El contenido de texto del mensaje, o null si el mensaje es una imagen.
 * @property messageType - El tipo de mensaje, puede ser 'text' o 'image'.
 * @property imageUrl - (Opcional) URL de la imagen si el mensaje es de tipo 'image'.
 * @property timestamp - Cadena ISO que representa cuándo se envió el mensaje.
 * @property isRead - (Opcional) Indica si el mensaje ha sido leído por el receptor.
 * @property isOptimistic - (Opcional) Indica si el mensaje se muestra de forma optimista antes de la confirmación del servidor.
 * @property errorSending - (Opcional) Indica si hubo un error al enviar el mensaje.
 */

export interface ChatMessageClient {
    id: string; 
    friendshipId?: string; 
    senderId: string;
    senderUsername: string;
    receiverId: string;
    messageText: string | null; 
    messageType: 'text' | 'image';
    imageUrl?: string | null;
    timestamp: string; 
    isRead?: boolean;
    isOptimistic?: boolean; 
    errorSending?: boolean; 
}

/**
 * Propiedades (props) para el componente PrivateChatWindow.
 *
 * @property isOpen - Determina si la ventana de chat está abierta.
 * @property onClose - Función de devolución de llamada que se invoca cuando se debe cerrar la ventana de chat.
 * @property friend - Objeto Friend que representa al destinatario del chat, o null si no hay ninguno seleccionado.
 */

interface PrivateChatWindowProps {
    isOpen: boolean;
    onClose: () => void;
    friend: Friend | null;
}
/**
 * Representa los distintos estados de una llamada de voz privada entre usuarios.
 *
 * - `'idle'`: No hay una llamada activa ni un intento de llamada.
 * - `'initiating_call'`: El usuario actual está intentando iniciar una llamada.
 * - `'incoming_call'`: El usuario actual está recibiendo una llamada entrante.
 * - `'connecting_webrtc'`: La señalización está en curso, intentando establecer una conexión WebRTC.
 * - `'connected'`: La llamada de voz está activa y conectada.
 * - `'ended'`: La llamada ha terminado, ya sea por colgar o por un error.
 * - `'declined'`: La llamada fue rechazada o cancelada por el usuario.
 * - `'error'`: Ocurrió un error irrecuperable durante el proceso de llamada.
 */

type CallState =
    | 'idle'              // Sin llamada activa o intento
    | 'initiating_call'   // El usuario actual está intentando llamar
    | 'incoming_call'     // El usuario actual está recibiendo una llamada
    | 'connecting_webrtc' // Señalización en progreso, intentando establecer WebRTC
    | 'connected'         // Llamada de voz activa
    | 'ended'             // La llamada terminó (ej. el otro colgó, o después de un error)
    | 'declined'          // La llamada fue rechazada o cancelada por el usuario
    | 'error';            // Hubo un error irrecuperable durante el proceso


/**
 * Objeto de configuración para servidores STUN de WebRTC.
 * 
 * Este objeto especifica una lista de servidores STUN (Session Traversal Utilities for NAT)
 * que se utilizan para facilitar las conexiones peer-to-peer, ayudando a los clientes a descubrir sus direcciones IP públicas.
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCIceServer}
 * @see {@link https://webrtc.org/getting-started/stun-turn-servers}
 */

const STUN_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};
const MESSAGES_BATCH_SIZE = 30; // Cuántos mensajes cargar por vez

/**
 * El componente PrivateChatWindow proporciona una interfaz de chat privado entre el usuario actual y un amigo.
 * 
 * Funcionalidades:
 * - Mensajería en tiempo real con actualizaciones optimistas de la UI.
 * - Carga y envío de imágenes con vista previa y soporte para añadir comentarios.
 * - Scroll infinito para el historial de chat con carga por lotes.
 * - Funcionalidad de llamada de voz usando WebRTC, incluyendo:
 *   - Iniciar, aceptar, rechazar y colgar llamadas.
 *   - Silenciar/reactivar el micrófono durante la llamada.
 *   - Retroalimentación sobre el estado de la llamada y gestión de la conexión.
 *   - Gestión de flujos de audio para usuarios locales y remotos.
 * - Integración con Socket.io para chat y señalización de voz.
 * - Manejo de errores y retroalimentación al usuario para acciones de chat y llamadas.
 * 
 * Props:
 * @param {boolean} isOpen - Indica si la ventana de chat está abierta.
 * @param {() => void} onClose - Función de devolución de llamada para cerrar la ventana de chat.
 * @param {Friend} friend - Objeto que representa al amigo con el que se está chateando.
 * 
 * Estado:
 * - messages: Lista de mensajes del chat.
 * - newMessageText: Valor actual del campo de entrada de texto.
 * - isLoadingHistory: Estado de carga del historial de mensajes.
 * - hasMoreHistory: Indica si hay más mensajes por cargar.
 * - error: Mensaje de error para operaciones de chat.
 * - selectedImageFile: Archivo de imagen actualmente seleccionado para subir.
 * - imagePreviewUrl: URL de vista previa para la imagen seleccionada.
 * - isUploadingImage: Estado de carga para mensajes con imagen.
 * - callState: Estado actual de la llamada de voz.
 * - localStream: Flujo de audio del usuario local.
 * - remoteStream: Flujo de audio del usuario remoto.
 * - isMuted: Indica si el micrófono local está silenciado.
 * - callFeedback: Mensaje de retroalimentación para acciones de llamada.
 * 
 * Uso:
 * ```tsx
 * <PrivateChatWindow
 *   isOpen={isChatOpen}
 *   onClose={handleCloseChat}
 *   friend={selectedFriend}
 * />
 * ```
 */
const PrivateChatWindow: React.FC<PrivateChatWindowProps> = ({ isOpen, onClose, friend }) => {
    const currentUser = useAuthStore(state => state.user);
    const { token } = useAuthStore.getState(); // Para la autenticación en la subida HTTP

    const [messages, setMessages] = useState<ChatMessageClient[]>([]);
    const [newMessageText, setNewMessageText] = useState(''); // Para mensajes de texto o pie de foto
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatWindowRef = useRef<HTMLDivElement>(null);

    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [callState, setCallState] = useState<CallState>('idle');
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const remoteAudioRef = useRef<HTMLAudioElement>(null); // Para reproducir el audio remoto
    const [callFeedback, setCallFeedback] = useState<string | null>(null);


    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };
    
    // Cargar historial de chat
    const loadChatHistory = useCallback((loadOlder = false, oldestMessageTimestamp?: string) => {
        if (!friend?.id || !currentUser?.id || !socketService.socket?.connected) {
            setError("No se puede cargar el historial: Conexión o datos de usuario/amigo faltantes.");
            setIsLoadingHistory(false);
            return;
        }
        
        console.log(`CHAT_WINDOW (${friend.username}): Solicitando historial. loadOlder: ${loadOlder}, beforeTimestamp: ${oldestMessageTimestamp}`);
        setIsLoadingHistory(true);
        setError(null);

        socketService.socket.emit('private_chat:get_history', 
            { friendUserId: friend.id, limit: MESSAGES_BATCH_SIZE, beforeTimestamp: oldestMessageTimestamp }, 
            (response: { success: boolean; messages?: ChatMessageClient[]; error?: string; hasMore?: boolean }) => {
                setIsLoadingHistory(false);
                if (response.success && response.messages) {
                    const validMessages = response.messages.filter(m => m && m.id); // Filtrar mensajes nulos o sin ID
                    console.log(`CHAT_WINDOW (${friend.username}): Historial recibido. ${validMessages.length} mensajes. ¿Hay más?: ${response.hasMore}`);
                    setMessages(prevMessages => 
                        loadOlder ? [...validMessages, ...prevMessages] : validMessages
                    );
                    setHasMoreHistory(response.hasMore ?? false);
                    if (!loadOlder && validMessages.length > 0) {
                        setTimeout(() => scrollToBottom("auto"), 50);
                    }
                } else {
                    console.error(`CHAT_WINDOW (${friend.username}): Error cargando historial:`, response.error);
                    setError(response.error || "Error desconocido al cargar el historial.");
                    if (!loadOlder) setMessages([]);
                }
            }
        );
    }, [friend?.id, currentUser?.id]); 
  // --- Lógica de Limpieza de WebRTC ---
    const cleanupWebRTCResources = useCallback((preserveCallState = false) => {
        console.log("VC: Limpiando recursos WebRTC...");
        if (peerConnectionRef.current) {
            peerConnectionRef.current.ontrack = null;
            peerConnectionRef.current.onicecandidate = null;
            peerConnectionRef.current.onconnectionstatechange = null;
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
            console.log("VC: PeerConnection cerrado y limpiado.");
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
            console.log("VC: LocalStream detenido y limpiado.");
        }
        if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
            (remoteAudioRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            remoteAudioRef.current.srcObject = null;
            console.log("VC: RemoteStream detenido y limpiado del elemento audio.");
        }
        setRemoteStream(null);
        if (!preserveCallState) { 
             setCallState('idle');
        }
        setIsMuted(false);
    }, [localStream]);

    const hangUp = useCallback((targetIdToNotify?: string, shouldNotifyPeer = true) => {
        console.log(`VC: Colgando llamada. Notificar a peer: ${shouldNotifyPeer}`);
        
        const actualTargetId = targetIdToNotify || friend?.id;

        if (shouldNotifyPeer && socketService.socket?.connected && actualTargetId) {
            socketService.socket.emit('voice_chat:hang_up', { targetUserId: actualTargetId });
            console.log(`VC: Emitido 'voice_chat:hang_up' a ${actualTargetId}`);
        }
        
        cleanupWebRTCResources(); 
        setCallFeedback("Llamada finalizada.");
        setTimeout(() => setCallFeedback(null), 3000);

    }, [friend?.id, cleanupWebRTCResources]);

    const createPeerConnection = useCallback((targetUserId: string) => {
        if (!currentUser?.id || !socketService.socket) return null;
        console.log(`VC: Creando RTCPeerConnection para chatear con ${targetUserId}`);
        const pc = new RTCPeerConnection(STUN_SERVERS);

        pc.onicegatheringstatechange = () => {
        if (pc) { 
            console.log(`[VC_ICE_GATHER] (${currentUser?.username} para ${targetUserId}) Estado de recolección ICE: ${pc.iceGatheringState}`);
        }
    };
     pc.onicecandidate = (event) => {
    if (event.candidate) {
        console.log(`[VC_ICE_SEND] (${currentUser?.username}) Candidato local: ${event.candidate.candidate.substring(0, 30)}... Tipo: ${event.candidate.type}`); // Loguea el candidato
        if (socketService.socket?.connected) {
            socketService.socket.emit('voice_chat:ice_candidate', {
                targetUserId: targetUserId, 
                candidate: event.candidate,
            });
        }
    } else {
        console.log(`[VC_ICE_SEND] (${currentUser?.username}) Fin de candidatos locales para ${targetUserId}.`);
    }
};

        pc.ontrack = (event) => {
            console.log("VC: Track de audio remoto recibido de peer.");
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
                if (remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = event.streams[0];
                }
            }
        };

       pc.onconnectionstatechange = () => {
    const usernameForLog = currentUser?.username || 'EsteCliente';
    const targetUsernameForLog = friend?.username || targetUserId; 
    console.log(`[VC_STATE] (${usernameForLog} -> ${targetUsernameForLog}): Conexión WebRTC cambió a: ${pc.connectionState}`);

    switch (pc.connectionState) {
        case 'connected':
            console.log(`[VC_STATE] (${usernameForLog}): ¡CONECTADO con ${targetUsernameForLog}!`);
            setCallState('connected');
            setCallFeedback(null); 
            break;
        case 'failed':
            console.error(`[VC_STATE] (${usernameForLog}): Conexión WebRTC FALLIDA con ${targetUsernameForLog}.`);
            setCallFeedback(`Fallo al conectar con ${targetUsernameForLog}.`);
            hangUp(targetUserId, false); 
            setCallState('error'); 
            break;
        case 'disconnected':
            console.warn(`[VC_STATE] (${usernameForLog}): DESCONECTADO de ${targetUsernameForLog}. WebRTC podría intentar reconectar.`);
            setCallFeedback(`Conexión perdida. Intentando reconectar...`);
            break;
        case 'closed':
            console.log(`[VC_STATE] (${usernameForLog}): Conexión WebRTC CERRADA con ${targetUsernameForLog}.`);
            if (callState !== 'idle' && callState !== 'ended' && callState !== 'declined') {
                cleanupWebRTCResources();
            }
            break;
        case 'new':
        
        case 'connecting':
            console.log(`[VC_STATE] (${usernameForLog}): Conexión WebRTC está ${pc.connectionState} con ${targetUsernameForLog}.`);
            if (callState !== 'connected' && callState !== 'error' && callState !== 'declined' && callState !== 'ended') {
                if(callState !== 'connecting_webrtc') setCallState('connecting_webrtc');
            }
            break;
    }
};

        return pc;
}, [currentUser?.id, friend?.username, cleanupWebRTCResources, hangUp]);


    const startCallSequence = useCallback(async (targetUserId: string, isInitiator: boolean) => {
        if (!socketService.socket || !currentUser?.id) return;
        console.log(`VC: Iniciando secuencia de llamada ${isInitiator ? 'como iniciador' : 'como aceptador'} para ${targetUserId}`);
        setCallState('connecting_webrtc');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);

            if (!peerConnectionRef.current) {
                peerConnectionRef.current = createPeerConnection(targetUserId);
            }
            if (!peerConnectionRef.current) throw new Error("No se pudo crear PeerConnection");

            stream.getTracks().forEach(track => {
                if (peerConnectionRef.current!.getSenders().find(s => s.track === track)) {
                    console.log("VC: Track ya añadido al PeerConnection.");
                } else {
                    peerConnectionRef.current!.addTrack(track, stream);
                    console.log("VC: Track de audio local añadido al PeerConnection.");
                }
            });
            
            if (isInitiator) { 
                const offer = await peerConnectionRef.current.createOffer();
                await peerConnectionRef.current.setLocalDescription(offer);
                console.log("VC: Oferta creada y LocalDescription establecida. Enviando oferta a", targetUserId);
                socketService.socket.emit('voice_chat:offer', { targetUserId, sdpOffer: offer });
            }
        } catch (err) {
            console.error("VC Error en startCallSequence:", err);
            setCallFeedback("Error al obtener audio o crear oferta.");
            setCallState('error');
            cleanupWebRTCResources(true); 
        }
    }, [currentUser?.id, createPeerConnection, cleanupWebRTCResources]);

    const handleInitiateCall = () => {
        if (callState === 'idle' && friend?.id && currentUser?.id && socketService.socket?.connected) {
            setCallFeedback(`Llamando a ${friend.username}...`);
            setCallState('initiating_call');
            socketService.socket.emit('voice_chat:initiate_call', { targetUserId: friend.id });
        }
    };

    const handleAcceptCall = () => {
        if (callState === 'incoming_call' && friend?.id && currentUser?.id && socketService.socket?.connected) {
            setCallFeedback(`Aceptando llamada de ${friend.username}...`);
            setCallState('connecting_webrtc'); 
            socketService.socket.emit('voice_chat:accept_call', { callerId: friend.id });
        }
    };

    const handleDeclineCall = () => {
        if ((callState === 'incoming_call' || callState === 'initiating_call') && friend?.id && socketService.socket?.connected) {
            console.log(`VC: Rechazando/Cancelando llamada con ${friend.username}`);
            socketService.socket.emit('voice_chat:decline_call', { callerId: friend.id }); 
            setCallFeedback("Llamada rechazada/cancelada.");
            setCallState('declined');
            setTimeout(() => setCallState('idle'), 3000);
        }
    };

      const handleHangUpClick = () => {
        if ((callState === 'connected' || callState === 'connecting_webrtc' || callState === 'initiating_call' || callState === 'incoming_call') && friend?.id) {
            hangUp(friend.id, true); 
        } else {
            cleanupWebRTCResources();
        }
    };
 
    
 const handleToggleMute = useCallback(() => {
        if (localStream) {
            let audioTrackEnabledState = false;
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled; 
                audioTrackEnabledState = track.enabled;
            });

            const newMutedState = !audioTrackEnabledState; 
            setIsMuted(newMutedState);
            
            if (newMutedState) {
                console.log("VC: Micrófono SILENCIADO");
                setCallFeedback("Micrófono silenciado");
            } else {
                console.log("VC: Micrófono DESILENCIADO");
                setCallFeedback("Micrófono reactivado");
            }
            setTimeout(() => setCallFeedback(null), 2000);
        } else {
            console.warn("VC: No hay localStream para silenciar/desilenciar.");
        }
    }, [localStream]);

    useEffect(() => {
        if (!isOpen || !socketService.socket || !currentUser?.id || !friend?.id) {
            if (callState !== 'idle') cleanupWebRTCResources(); 
            return;
        }

        const onCallAcceptedByPeer = (data: { accepterId: string, accepterUsername: string }) => {
            if (data.accepterId === friend?.id && callState === 'initiating_call') {
                console.log(`VC: ${data.accepterUsername} aceptó tu llamada. Iniciando secuencia WebRTC.`);
                setCallFeedback(`Conectando con ${data.accepterUsername}...`);
                startCallSequence(data.accepterId, true); 
            }
        };

        const onOfferReceived = async (data: { senderId: string, sdpOffer: RTCSessionDescriptionInit }) => {
            if (data.senderId === friend?.id && (callState === 'connecting_webrtc' || callState === 'incoming_call')) { 
                console.log(`VC: Oferta SDP recibida de ${data.senderId}. Creando respuesta...`);
                setCallFeedback(`Recibiendo datos de ${friend.username}...`);
                setCallState('connecting_webrtc');
                try {
                    if (!peerConnectionRef.current) {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                        setLocalStream(stream);
                        peerConnectionRef.current = createPeerConnection(data.senderId);
                        if (!peerConnectionRef.current) throw new Error("Fallo al crear PeerConnection para respuesta");
                        stream.getTracks().forEach(track => peerConnectionRef.current!.addTrack(track, stream));
                    }
                    
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdpOffer));
                    const answer = await peerConnectionRef.current.createAnswer();
                    await peerConnectionRef.current.setLocalDescription(answer);

                    if (socketService.socket?.connected) {
                        socketService.socket.emit('voice_chat:answer', { targetUserId: data.senderId, sdpAnswer: answer });
                    }
                } catch (err) { console.error("VC Error en onOfferReceived:", err); setCallFeedback("Error procesando oferta."); setCallState('error'); cleanupWebRTCResources(true); }
            }
        };
        const onAnswerReceived = async (data: { senderId: string, sdpAnswer: RTCSessionDescriptionInit }) => {
            if (peerConnectionRef.current && data.senderId === friend?.id && callState === 'connecting_webrtc') {
                console.log(`VC: Respuesta SDP recibida de ${data.senderId}`);
                try {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdpAnswer));
                } catch (err) { console.error("VC Error en onAnswerReceived:", err); setCallFeedback("Error procesando respuesta."); setCallState('error'); cleanupWebRTCResources(true); }
            }
        };

   const onIceCandidateReceived = async (data: { senderId: string, candidate: RTCIceCandidateInit | null }) => {
    if (!peerConnectionRef.current || data.senderId !== friend?.id ) return;

    if (data.candidate) {
        console.log(`[VC_ICE_RECV] (${currentUser?.username}) Candidato ICE recibido de ${data.senderId}. Intentando añadir...`);
        try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log(`[VC_ICE_RECV] (${currentUser?.username}) Candidato ICE de ${data.senderId} añadido OK.`);
        } catch (err) {
            console.error(`[VC_ICE_RECV] (${currentUser?.username}) ERROR al añadir candidato ICE de ${data.senderId}:`, err, "Candidato:", data.candidate);
        }
    } else {
        console.log(`[VC_ICE_RECV] (${currentUser?.username}) Recibido final de candidatos (null) de ${data.senderId}.`);
    }
};

        const onCallEndedByPeer = (data: { leaverId: string, leaverUsername?: string, reason?: string }) => {
            if (data.leaverId === friend?.id && (callState === 'connected' || callState === 'connecting_webrtc')) {
                console.log(`VC: ${data.leaverUsername || data.leaverId} ha finalizado la llamada.`);
                setCallFeedback(`Llamada con ${data.leaverUsername || friend.username} terminada.`);
                cleanupWebRTCResources();
                setCallState('ended');
                setTimeout(() => setCallState('idle'), 3000);
            }
        };
        
        const onCallDeclinedByPeer = (data: { declinerId: string, declinerUsername: string }) => {
             if (data.declinerId === friend?.id && callState === 'initiating_call') {
                console.log(`VC: ${data.declinerUsername} rechazó tu llamada.`);
                setCallFeedback(`${data.declinerUsername} rechazó la llamada.`);
                cleanupWebRTCResources();
                setCallState('declined');
                setTimeout(() => setCallState('idle'), 3000);
            }
        };

        socketService.socket.on('voice_chat:call_accepted_by_peer', onCallAcceptedByPeer);
        socketService.socket.on('voice_chat:offer_received', onOfferReceived);
        socketService.socket.on('voice_chat:answer_received', onAnswerReceived);
        socketService.socket.on('voice_chat:ice_candidate_received', onIceCandidateReceived);
        socketService.socket.on('voice_chat:call_ended', onCallEndedByPeer);
        socketService.socket.on('voice_chat:call_declined_by_peer', onCallDeclinedByPeer);
        return () => {
            socketService.socket?.off('voice_chat:call_accepted_by_peer', onCallAcceptedByPeer);
            socketService.socket?.off('voice_chat:offer_received', onOfferReceived);
            socketService.socket?.off('voice_chat:answer_received', onAnswerReceived);
            socketService.socket?.off('voice_chat:ice_candidate_received', onIceCandidateReceived);
            socketService.socket?.off('voice_chat:call_ended', onCallEndedByPeer);
            socketService.socket?.off('voice_chat:call_declined_by_peer', onCallDeclinedByPeer);
        };
    }, [isOpen, currentUser?.id, friend?.id, callState, startCallSequence, cleanupWebRTCResources, createPeerConnection]);
    useEffect(() => {
        if (!socketService.socket || !currentUser?.id) return; 

        const handleGlobalIncomingCall = (data: { callerId: string, callerUsername: string }) => {
            if (data.callerId === currentUser.id) return;

            if (isOpen && friend?.id === data.callerId && callState === 'idle') {
                console.log(`VC (${friend.username}): Llamada entrante detectada de ${data.callerUsername} (coincide con amigo actual).`);
                setCallFeedback(`Llamada entrante de ${data.callerUsername}...`);
                setCallState('incoming_call');
            } else if (callState !== 'idle' && callState !== 'connected' && callState !== 'connecting_webrtc') {
                 console.log(`VC: Llamada entrante de ${data.callerUsername} pero estoy en estado ${callState}.`);
               
            } else if (!isOpen || friend?.id !== data.callerId) {
               
                console.log(`VC: Notificación global (simulada): Llamada entrante de ${data.callerUsername}.`);
            }
        };
        socketService.socket.on('voice_chat:incoming_call', handleGlobalIncomingCall);
        return () => {
            socketService.socket?.off('voice_chat:incoming_call', handleGlobalIncomingCall);
        };
    }, [isOpen, friend?.id, currentUser?.id, callState]); 

    useEffect(() => {
        if (isOpen && friend && currentUser?.id) {
            console.log(`CHAT_WINDOW: Abriendo para ${friend.username}. Limpiando y cargando historial.`);
            setMessages([]); 
            setError(null);
            setHasMoreHistory(true);
            loadChatHistory(false); 
            if (socketService.socket?.connected) {
                socketService.socket.emit('private_chat:mark_as_read', { friendUserId: friend.id }, (res: { success: boolean; [key: string]: any }) => {
                    if(res.success) console.log(`CHAT_WINDOW: Solicitud para marcar como leídos para ${friend.username} enviada.`);
                });
            }
        } else if (!isOpen) {
            setMessages([]); setError(null); setIsLoadingHistory(false); setHasMoreHistory(true); 
            setNewMessageText(''); setSelectedImageFile(null); setImagePreviewUrl(null); 
        }
    }, [isOpen, friend?.id, currentUser?.id, loadChatHistory]);

    useEffect(() => {
        if (!isOpen || !socketService.socket || !friend?.id || !currentUser?.id) return;

        const handleNewMessage = (messageFromServer: ChatMessageClient) => {            
            const isMyOwnMsg = messageFromServer.senderId === currentUser.id;
            const isFromCurrentFriend = messageFromServer.senderId === friend.id;
            const isForMe = messageFromServer.receiverId === currentUser.id;
            const isForCurrentFriend = messageFromServer.receiverId === friend.id;

            const isRelevantToThisChat = (isMyOwnMsg && isForCurrentFriend) || (isFromCurrentFriend && isForMe);

            if (isRelevantToThisChat) {
                if (isMyOwnMsg) {   
                    setMessages(prev => prev.map(m => m.isOptimistic && m.timestamp === messageFromServer.timestamp && m.messageText === messageFromServer.messageText ? {...messageFromServer, isOptimistic: false } : m));

                } else { 
                    setMessages(prevMessages => {
                        if (!prevMessages.some(m => m.id === messageFromServer.id)) {
                            return [...prevMessages, {...messageFromServer, timestamp: new Date(messageFromServer.timestamp).toISOString()}];
                        }
                        return prevMessages; 
                    });
                    setTimeout(() => scrollToBottom(), 0);

                    if (document.hasFocus() && chatWindowRef.current?.contains(document.activeElement)) {
                        socketService.socket?.emit('private_chat:mark_as_read', { friendUserId: friend.id });
                    }
                }
            }
        };

        socketService.socket.on('private_chat:new_message', handleNewMessage);
        return () => {
            socketService.socket?.off('private_chat:new_message', handleNewMessage);
        };
    }, [isOpen, friend?.id, currentUser?.id]);

    const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 5 * 1024 * 1024) { // Límite de 5MB
                alert("La imagen es demasiado grande (máximo 5MB).");
                return;
            }
            setSelectedImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => { setImagePreviewUrl(reader.result as string); };
            reader.readAsDataURL(file);
        } else {
            setSelectedImageFile(null); setImagePreviewUrl(null);
            if (file) alert("Por favor, selecciona un archivo de imagen válido.");
        }
        if(event.target) event.target.value = ""; 
    };

    const triggerFileInput = () => { fileInputRef.current?.click(); };
    const cancelImageSelection = () => { setSelectedImageFile(null); setImagePreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

    const sendChatMessageViaSocket = (
        text: string | null,
        type: 'text' | 'image',
        imageUrl?: string | null
    ) => {
        if (!friend?.id || !currentUser?.id || !socketService.socket?.connected) return;

        const tempOptimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const optimisticMessage: ChatMessageClient = {
            id: tempOptimisticId,
            senderId: currentUser.id,
            senderUsername: currentUser.username || "Tú",
            receiverId: friend.id,
            messageText: text,
            messageType: type,
            imageUrl: type === 'image' ? (imageUrl || imagePreviewUrl) : undefined, 
            timestamp: new Date().toISOString(),
            isRead: true,
            isOptimistic: true,
        };

        setMessages(prev => [...prev, optimisticMessage]);
        if (type === 'text') setNewMessageText(''); 
        
        setTimeout(() => scrollToBottom("auto"), 0);

        socketService.socket.emit('private_chat:send_message',
            { receiverUserId: friend.id, messageText: text, imageUrl: imageUrl, },
            (response: { success: boolean; message?: ChatMessageClient; error?: string }) => {
                if (response.success && response.message) {
                    console.log(`CHAT_WINDOW (${friend?.username}): Mensaje optimista ${tempOptimisticId} CONFIRMADO. ID real: ${response.message.id}`);
                    setMessages(prev => prev.map(msg =>
                        msg.id === tempOptimisticId ? { ...response.message!, timestamp: new Date(response.message!.timestamp).toISOString(), isOptimistic: false } : msg
                    ));
                } else {
                    console.error(`CHAT_WINDOW (${friend?.username}): Error al enviar mensaje optimista ${tempOptimisticId}:`, response.error);
                    setMessages(prev => prev.map(msg =>
                        msg.id === tempOptimisticId ? { ...msg, isOptimistic: false, errorSending: true, messageText: `${msg.messageText || ''} (Error al enviar)` } : msg
                    ));
                }
            }
        );
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const captionText = newMessageText.trim(); 

        if (!selectedImageFile && !captionText) return; 

        if (selectedImageFile) {
            setIsUploadingImage(true);
            const formData = new FormData();
            formData.append('chatImage', selectedImageFile);

            try {
                const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
                const uploadResponse = await fetch(`${apiBaseUrl}/api/chat/upload-image`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });
                
                setIsUploadingImage(false);
                const result = await uploadResponse.json();

                if (uploadResponse.ok && result.success && result.imageUrl) {
                    sendChatMessageViaSocket(captionText || null, 'image', result.imageUrl);
                    cancelImageSelection(); 
                    setNewMessageText(''); 
                } else {
                    alert(`Error al subir la imagen: ${result.message || 'Error desconocido'}`);
                    cancelImageSelection();
                }
            } catch (uploadError) {
                setIsUploadingImage(false);
                cancelImageSelection();
                console.error("Excepción al subir imagen:", uploadError);
                alert("Excepción al subir la imagen. Revisa la consola.");
            }
        } else if (captionText) { 
            sendChatMessageViaSocket(captionText, 'text');
        }
    };
 const getFullImageUrl = (imageUrl: string) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('blob:')) return imageUrl;

    const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    if (imageUrl.startsWith('/')) {
        return baseUrl + imageUrl;
    }
    return baseUrl + '/' + imageUrl;
    };

    if (!isOpen || !friend) return null;

    return (
          <div ref={chatWindowRef} className="fixed bottom-0 right-4 md:right-20 bg-slate-900 text-slate-100 w-full max-w-sm h-[55vh] md:h-[60vh] shadow-2xl rounded-t-lg flex flex-col border border-slate-700 z-[80]">
            <div className="bg-slate-800 p-3 flex justify-between items-center rounded-t-lg border-b border-slate-700">
                <h3 className="text-lg font-semibold text-teal-400 truncate" title={friend.username}>
                    Chat con {friend.username}
                </h3>
                <div className="flex items-center space-x-2">
                    {callState === 'idle' && (
                        <button 
                            onClick={handleInitiateCall} 
                            className="p-1.5 text-green-400 hover:text-green-300"
                            title={`Llamar a ${friend.username}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.076a1.5 1.5 0 0 1-.49 1.55l-1.295.972a11.022 11.022 0 0 0 6.073 6.073l.972-1.295a1.5 1.5 0 0 1 1.55-.49l3.076.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-5.523 0-10-4.477-10-10V3.5Z" />
                            </svg>
                        </button>
                    )}
                    {callState === 'initiating_call' && (
                        <div className="flex items-center space-x-1">
                            <span className="text-xs text-yellow-400 animate-pulse">Llamando...</span>
                            <button onClick={handleHangUpClick} className="p-1.5 text-red-400 hover:text-red-300" title="Cancelar Llamada">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 transform rotate-[135deg]">
                                  <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.076a1.5 1.5 0 0 1-.49 1.55l-1.295.972a11.022 11.022 0 0 0 6.073 6.073l.972-1.295a1.5 1.5 0 0 1 1.55-.49l3.076.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-5.523 0-10-4.477-10-10V3.5Z" />
                                </svg>
                            </button>
                        </div>
                    )}
                     {callState === 'incoming_call' && (
                        <div className="flex items-center space-x-1">
                             <span className="text-xs text-yellow-400 animate-pulse">Llamada de {friend.username}</span>
                            <button onClick={handleAcceptCall} className="p-1.5 text-green-400 hover:text-green-300" title="Aceptar Llamada">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button onClick={handleDeclineCall} className="p-1.5 text-red-400 hover:text-red-300" title="Rechazar Llamada">
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 transform rotate-[135deg]">
                                  <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.076a1.5 1.5 0 0 1-.49 1.55l-1.295.972a11.022 11.022 0 0 0 6.073 6.073l.972-1.295a1.5 1.5 0 0 1 1.55-.49l3.076.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-5.523 0-10-4.477-10-10V3.5Z" />
                                </svg>
                            </button>
                        </div>
                    )}
                    {(callState === 'connecting_webrtc') && (
                        <span className="text-xs text-yellow-400 animate-pulse">Conectando...</span>
                    )}
                    {callState === 'connected' && (
                        <div className="flex items-center space-x-2">
                             <span className="text-xs text-green-400">En llamada</span>
                            <button onClick={handleToggleMute} className={`p-1.5 rounded ${isMuted ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-slate-600 hover:bg-slate-500'} text-white`} title={isMuted ? "Activar Micrófono" : "Silenciar Micrófono"}>
                                {isMuted ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 2.5c-.862 0-1.675.09-2.45.26A9.75 9.75 0 0 0 2.5 9.5v.746a1.5 1.5 0 0 0 .975 1.413l2.501.834a1.5 1.5 0 0 0 1.874-1.136l.233-.814a4.504 4.504 0 0 1 3.834 0l.233.814a1.5 1.5 0 0 0 1.874 1.136l2.501-.834a1.5 1.5 0 0 0 .975-1.413V9.5a9.75 9.75 0 0 0-5.05-6.74A7.52 7.52 0 0 0 10 2.5ZM4 9.5a8.25 8.25 0 0 1 4.289-7.205A5.976 5.976 0 0 1 10 2.5c.046 0 .092 0 .138.002A5.975 5.975 0 0 1 11.71 4.7a6.003 6.003 0 0 1 4.133 3.497l.124.433.945.315a.75.75 0 0 0 .258-1.472L16.21 7.16A8.223 8.223 0 0 0 10 4a8.223 8.223 0 0 0-6.21 3.16l-.962.32a.75.75 0 0 0 .258 1.472l.945-.315.124-.433A6.003 6.003 0 0 1 8.289 4.7a5.978 5.978 0 0 1 1.572-1.995V2.5ZM2.604 14.339a.75.75 0 0 1-.023-1.06L5.7 10.161a.75.75 0 0 1 1.06 1.06L3.666 14.3a.75.75 0 0 1-1.061.04Zm14.815-1.038a.75.75 0 0 1-1.061-1.061l3.12-3.118a.75.75 0 1 1 1.06 1.06l-3.118 3.118Z" clipRule="evenodd" /></svg> : 
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Zm4 10.93V17.5a.75.75 0 0 1-1.5 0v-2.57A6.968 6.968 0 0 0 2.065 9.575a.75.75 0 0 1-1.49.15A8.458 8.458 0 0 0 9.25 17.5v2.25a.75.75 0 0 0 1.5 0V17.5A8.458 8.458 0 0 0 19.426 9.72a.75.75 0 0 1-1.49-.145A6.968 6.968 0 0 0 11 14.93Z" /></svg>}
                            </button>
                            <button onClick={handleHangUpClick} className="p-1.5 text-red-400 hover:text-red-300" title="Colgar Llamada">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 transform rotate-[135deg]">
                                  <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.076a1.5 1.5 0 0 1-.49 1.55l-1.295.972a11.022 11.022 0 0 0 6.073 6.073l.972-1.295a1.5 1.5 0 0 1 1.55-.49l3.076.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-5.523 0-10-4.477-10-10V3.5Z" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-red-400 font-bold text-2xl leading-none p-1">&times;</button>
            </div>

            {callFeedback && (callState !== 'connected' && callState !== 'idle') && (
                <div className="p-2 text-xs text-center text-sky-300 bg-slate-700/80">
                    {callFeedback}
                </div>
            )}

            {error && <p className="p-2 text-red-400 bg-red-800 text-sm text-center flex-shrink-0">{error}</p>}
            
            <div className="flex-grow overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {isLoadingHistory && messages.length === 0 && (
                    <div className="flex justify-center items-center h-full">
                        <p className="text-slate-400">Cargando historial...</p>
                    </div>
                )}
                {hasMoreHistory && !isLoadingHistory && (messages.length > 0 || !isLoadingHistory && !error) && (
                    <div className="text-center">
                        <button 
                            onClick={() => loadChatHistory(true, messages[0]?.timestamp)}
                            className="text-xs text-sky-400 hover:text-sky-300 py-1 disabled:opacity-50"
                            disabled={isLoadingHistory}
                        >
                            {isLoadingHistory ? 'Cargando...' : 'Cargar mensajes anteriores'}
                        </button>
                    </div>
                )}
                {!isLoadingHistory && !hasMoreHistory && messages.length >= MESSAGES_BATCH_SIZE && (
                     <p className="text-xs text-slate-500 text-center py-1 italic">Fin del historial.</p>
                )}
                 {!isLoadingHistory && messages.length === 0 && !error && !hasMoreHistory && (
                    <p className="text-slate-400 text-center py-4">Aún no hay mensajes en este chat. ¡Envía el primero!</p>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                        <div 
                            title={msg.isOptimistic ? "Enviando..." : msg.errorSending ? "Error al enviar" : new Date(msg.timestamp).toLocaleString()}
                            className={`max-w-[80%] p-2 rounded-lg shadow-md text-sm break-words ${
                            msg.senderId === currentUser?.id 
                                ? 'bg-teal-600 text-white rounded-br-none' 
                                : 'bg-slate-600 text-slate-50 rounded-bl-none'
                        } ${msg.isOptimistic ? 'opacity-60 animate-pulse' : ''} ${msg.errorSending ? 'bg-red-700 border border-red-500 opacity-90' : ''}`}>
                            {msg.messageType === 'image' && msg.imageUrl && (
                                <img 
src={msg.imageUrl.startsWith('blob:') ? msg.imageUrl : getFullImageUrl(msg.imageUrl)}
                                    alt={msg.messageText || "Imagen adjunta"} 
                                    className="max-w-full h-auto max-h-48 sm:max-h-56 rounded-md my-1 object-contain cursor-pointer"
                                    onClick={() => window.open(msg.imageUrl?.startsWith('blob:') ? msg.imageUrl : `${import.meta.env.VITE_API_BASE_URL || ''}${msg.imageUrl}`, '_blank')}
                                    onLoad={msg.isOptimistic ? () => scrollToBottom("auto") : undefined} 
                                />
                            )}
                            {msg.messageText && <p className="whitespace-pre-wrap">{msg.messageText}</p>}
                            
                            <p className={`text-xs mt-1 ${msg.senderId === currentUser?.id ? 'text-teal-200' : 'text-slate-400'} text-right`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {imagePreviewUrl && (
                <div className="p-2 border-t border-slate-700 bg-slate-800/50 relative flex items-center justify-center">
                    <img src={imagePreviewUrl} alt="Previsualización" className="max-h-20 rounded border border-slate-600" />
                    <button 
                        onClick={cancelImageSelection} 
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold leading-none shadow-md"
                        title="Cancelar imagen"
                    >
                        &times;
                    </button>
                </div>
            )}

            <form onSubmit={handleFormSubmit} className="p-3 border-t border-slate-700 flex items-end gap-2 bg-slate-800">
                <button 
                    type="button" 
                    onClick={triggerFileInput} 
                    className="p-2 text-slate-400 hover:text-teal-400 transition-colors flex-shrink-0 rounded-md hover:bg-slate-700"
                    title="Adjuntar imagen"
                    disabled={isUploadingImage}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.53 9.53l3.454-3.553a3 3 0 0 0 0-4.242Z" clipRule="evenodd" />
                    </svg>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageFileChange} 
                    accept="image/png, image/jpeg, image/gif" 
                    className="hidden" 
                    disabled={isUploadingImage}
                />
                
                <textarea
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder={selectedImageFile ? "Añade un pie de foto..." : "Escribe un mensaje..."}
                    className="flex-grow bg-slate-700 border border-slate-600 text-white placeholder-slate-400 px-3 py-2 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm outline-none resize-none"
                    rows={selectedImageFile ? 2 : 1}
                    disabled={isUploadingImage}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault(); 
                            handleFormSubmit(e as any); 
                        }
                    }}
                />
                <button 
                    type="submit" 
                    className="bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={(!newMessageText.trim() && !selectedImageFile) || isUploadingImage}
                >
                    {isUploadingImage ? 'Subiendo...' : 'Enviar'}
                </button>
            </form>
            <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
        </div>
    );
};

export default PrivateChatWindow;

