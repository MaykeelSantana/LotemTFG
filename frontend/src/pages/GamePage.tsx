/**
 * Componente principal de la página de juego en un entorno virtual multijugador.
 * 
 * Este componente integra la lógica de renderizado 2D en tiempo real con PixiJS,
 * la gestión de estado y UI con React, y la comunicación en tiempo real con el servidor
 * mediante WebSockets (socket.io).
 * 
 * Funcionalidades principales:
 * - Renderizado del mundo virtual y avatares de jugadores con animaciones por capas.
 * - Movimiento y pathfinding basado en comandos del servidor.
 * - Chat global y privado entre jugadores.
 * - Personalización de avatares mediante un ropero (selección de estilos).
 * - Gestión de inventario, colocación de objetos y actualización en tiempo real.
 * - Navegación y creación de salas de juego.
 * - Paneles overlay para inventario, tienda, amigos, chat privado, ropero y navegador de salas.
 * 
 * Estado y referencias manejados:
 * - Datos de autenticación y jugador actual.
 * - Listados y estados de otros jugadores y objetos en la sala.
 * - Estado de UI para paneles superpuestos y mensajes de error/carga.
 * - Referencias a instancias de PixiJS, sprites y animaciones.
 * 
 * Flujo de inicialización:
 * 1. Verifica la autenticación del usuario.
 * 2. Se conecta al servidor y une al usuario a la sala indicada.
 * 3. Recibe y carga datos iniciales: mapa, jugadores, objetos.
 * 4. Carga y cachea spritesheets necesarios para los estilos de los jugadores.
 * 5. Inicializa la aplicación PixiJS y comienza el renderizado.
 * 6. Escucha eventos en tiempo real para actualizar estado, movimientos, chat y objetos.
 * 
 * Optimización y arquitectura:
 * - Uso intensivo de React refs y efectos para minimizar renders y evitar fugas de memoria.
 * - Separación clara entre lógica de renderizado y lógica de negocio.
 * - Sistema de capas y atlas para facilitar adición de nuevos estilos y objetos.
 * - UI responsiva y accesible mediante TailwindCSS.
 * 
 * Dependencias principales:
 * - React
 * - PixiJS
 * - socket.io-client
 * - TailwindCSS
 * - Componentes overlay: WardrobePanel, CatalogPanel, InventoryPanel, RoomNavigator, HotelView, FriendsPanel, PrivateChatWindow
 * 
 * @component
 * @returns {JSX.Element} Renderiza la interfaz de juego completa con canvas y paneles superpuestos.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Application, Graphics, Text, TextStyle, FederatedPointerEvent, Ticker, Container, AnimatedSprite, Spritesheet, Assets, DisplayObject, Sprite, Texture } from 'pixi.js';
import { socketService } from '../services/socket.service';
import { useAuthStore } from '../store/auth.store';
import { useParams, useNavigate, useLocation } from 'react-router-dom'; 
import WardrobePanel, { type SelectedStyles } from '../components/game/WardrobePanel'; 
import CatalogPanel from '../components/game/CatalogPanel';
import male_base_white_url from '/assets/Characters/male_base_white/male_base_white.json?url'; 
import female_white_base_url from '/assets/Characters/female_white_base/female_white_base.json?url';
import male_base_black_url from '/assets/Characters/male_base_black/male_base_black.json?url';
import purple_shirt_url from '/assets/Characters/purple_shirt/purple_shirt.json?url';
import orange_shirt_url from '/assets/Characters/orange_shirt/orange_shirt.json?url'; 
import short_white_jeans_url from '/assets/Characters/white_jeans/white_jeans.json?url'; 
import hair_brown_long_url from '/assets/Characters/hairs/brown_long/brown_long.json?url'; 
import hair_woman_pink_url from '/assets/Characters/hairs/woman_pink/woman_pink.json?url'; 
import hair_woman_black_url from '/assets/Characters/hairs/woman_black/woman_black.json?url'; 
import hair_short_black_url from '/assets/Characters/hairs/short_black/short_black.json?url';

import InventoryPanel from '../components/game/inventory/InventoryPanel';
import type { PlayerInventoryItemClient } from '../types/inventory.types'; 
import type { RoomDetailsClient, RoomPlacedItemClient } from '../types/room.types';
import RoomNavigator from '../components/game/RoomNavigator';
import HotelView from '../components/game/lobby/HotelView';
import FriendsPanel from '../components/game/friends/FriendsPanel';
import type { Friend } from '../types/friend.types';
import PrivateChatWindow from '../components/game/friends/PrivateChatWindow';
interface PlayerDataFromServer {
    characterId: string;
    username: string;
    x: number;
    y: number;
    bodyStyle: string;
    hairStyle: string;
    shirtStyle: string;
    pantsStyle: string;
}

interface WorldCoordinates {
    x: number;
    y: number;
}

interface PlayerState extends PlayerDataFromServer {
 container: Container;
    bodySprite?: AnimatedSprite;
    hairSprite?: AnimatedSprite;   
    shirtSprite?: AnimatedSprite;  
    pantsSprite?: AnimatedSprite;  
    nameTag?: Text;
    currentPath?: WorldCoordinates[] | null;
    currentPathIndex?: number;
    chatTextObject?: Text | null;
    chatTextTimeoutId?: ReturnType<typeof setTimeout> | null;
    currentAnimationName?: string; 
    facingDirection: 'up' | 'down' | 'left' | 'right';
}

interface MapGridData {
    matrix: number[][];
    cellSize: number;
    gridCols: number;
    gridRows: number;
    worldWidth: number;
    worldHeight: number;
}

interface ChatMessageData {
    characterId: string;
    username: string;
    messageText: string;
    timestamp: string;
}

const PLAYER_SPEED = 2.5;
const NAME_TAG_STYLE = new TextStyle({ fontSize: 12, fill: 'white', align: 'center', stroke: 'black', strokeThickness: 0.5 });
const SIMPLE_CHAT_TEXT_STYLE = new TextStyle({
    fontSize: 14,
    fill: 'white',
    align: 'center',
    stroke: '#000000',
    strokeThickness: 3,
    wordWrap: true,
    wordWrapWidth: 180,
    breakWords: true,
    lineHeight: 16,
});
const CHAT_TEXT_LIFETIME_MS = 5000;
const OTHER_PLAYER_COLOR = 0xffa500;
const SPRITE_SCALE_FACTOR = 2.5; 

const STYLE_ASSET_MAPPING: Record<string, string> = {
    "male_base_white": male_base_white_url,
    "female_white_base": female_white_base_url,
    "male_base_black": male_base_black_url,
    "purple_shirt": purple_shirt_url,
    "orange_shirt": orange_shirt_url, 
    "white_jeans": short_white_jeans_url, 
    "hair_brown_long": hair_brown_long_url, 
    "hair_woman_pink": hair_woman_pink_url,
    "hair_woman_black": hair_woman_black_url,
    "hair_short_black": hair_short_black_url,
};

const AVAILABLE_STYLES = {
    hair: [
        { key: "hair_brown_long", name: "Pelo Medio Largo Marrón" },
        { key: "hair_woman_pink", name: "Pelo Largo Rosa" }, 
        { key: "hair_woman_black", name: "Pelo Largo Negro" }, 
        { key: "hair_short_black", name: "Pelo Corto Negro" }, 

    ],
    shirt: [
        { key: "purple_shirt", name: "Camisa Morada" }, 
        { key: "orange_shirt", name: "Camisa Naranja" }, 
    ],
    pants: [
         { key: "white_jeans", name: "Pantalones cortos blancos" },
    ],
  body: [
        { key: "male_base_white", name: "Base Hombre (Blanco)"},
        { key: "male_base_black", name: "Base Hombre (Negro)"},
       { key: "female_white_base", name: "Base Mujer (Blanco)"},
     ]
};
const loadedSpritesheets: Record<string, Spritesheet> = {};

const ANIMATION_SPEEDS: Record<string, number> = {
    "walk_down": 0.15,
    "walk_up": 0.15,
    "walk_left": 0.15,
    "walk_right": 0.15,
};
const DEFAULT_SPRITE_ANCHOR = { x: 0.5, y: 1.0 };
const PLAYER_RADIUS = 10; 

async function loadStyleAtlas(styleKey: string): Promise<Spritesheet | null> {
    if (!styleKey || styleKey.endsWith("_none") || styleKey === "") { return null; }

    if (loadedSpritesheets[styleKey]) {
        const cachedSheet = loadedSpritesheets[styleKey];
        let allTexturesStillValid = true;
        if (cachedSheet.textures && Object.keys(cachedSheet.textures).length > 0) {
            for (const texName in cachedSheet.textures) {
                const texture = cachedSheet.textures[texName];
                if (!texture || !texture.baseTexture || !texture.baseTexture.valid) {
                    allTexturesStillValid = false;
                    console.warn(`loadStyleAtlas: Textura inválida ('${texName}') encontrada en spritesheet cacheado para '${styleKey}'. Se recargará.`);
                    break;
                }
            }
        } else if (cachedSheet.animations && Object.keys(cachedSheet.animations).length > 0) {
            for (const animName in cachedSheet.animations) {
                const firstTexture = cachedSheet.animations[animName]?.[0];
                if (!firstTexture || !firstTexture.baseTexture || !firstTexture.baseTexture.valid) {
                    allTexturesStillValid = false;
                    console.warn(`loadStyleAtlas: Textura de animación inválida ('${animName}') en spritesheet cacheado para '${styleKey}'. Se recargará.`);
                    break;
                }
            }
        } else if (!cachedSheet.data) { 
             allTexturesStillValid = false;
             console.warn(`loadStyleAtlas: Spritesheet cacheado para '${styleKey}' no tiene .data. Se recargará.`);
        }


        if (allTexturesStillValid) {
            console.log(`loadStyleAtlas: Usando spritesheet cacheado y validado para '${styleKey}'.`);
            return cachedSheet;
        } else {
            console.log(`loadStyleAtlas: Eliminando entrada inválida del caché para '${styleKey}' y recargando.`);
            delete loadedSpritesheets[styleKey];
            
        }
    }
    
    const atlasUrl = STYLE_ASSET_MAPPING[styleKey];
    if (!atlasUrl) {
        console.warn(`loadStyleAtlas: No se encontró URL para styleKey: '${styleKey}'.`);
        return null;
    }

    try {
        console.log(`loadStyleAtlas: Cargando NUEVO atlas para '${styleKey}' desde ${atlasUrl}...`);
        const sheet = await Assets.load<Spritesheet>(atlasUrl);

        if (sheet && sheet.data && sheet.animations && sheet.textures) {
            let allAnimTexturesValid = true;
            for (const animKey in sheet.animations) {
                const animTextures = sheet.animations[animKey];
                if (!animTextures || animTextures.length === 0) continue;
                for (const tex of animTextures) {
                    if (!tex || !tex.baseTexture || !tex.baseTexture.valid) {
                        console.error(`loadStyleAtlas: Textura inválida en animación '${animKey}' para styleKey '${styleKey}'. URL: ${atlasUrl}`);
                        allAnimTexturesValid = false;
                        break; 
                    }
                }
                if (!allAnimTexturesValid) break;
            }

            if (!allAnimTexturesValid) {
                console.error(`loadStyleAtlas: No todas las texturas de animación son válidas para ${styleKey} DESPUÉS de la carga. No se cacheará.`);
                return null;
            }

            console.log(`loadStyleAtlas: Atlas para '${styleKey}' CARGADO y VALIDADO. Animaciones:`, Object.keys(sheet.animations || {}).join(', ') || 'Ninguna');
            loadedSpritesheets[styleKey] = sheet;
            return sheet;
        } else {
            console.error(`loadStyleAtlas: Assets.load devolvió un sheet inválido para ${atlasUrl} (styleKey: '${styleKey}')`, sheet);
            return null;
        }
    } catch (error: any) {
        console.error(`loadStyleAtlas: EXCEPCIÓN al cargar atlas desde ${atlasUrl} (styleKey: '${styleKey}'):`, error.message, error);
        return null;
    }
}
const GamePage: React.FC = () => {
    const pixiContainerRef = useRef<HTMLDivElement>(null);
    const pixiAppRef = useRef<Application | null>(null);
    const location = useLocation();
    const welcomeTextRef = useRef<Text | null>(null);
    const groundRef = useRef<Graphics | null>(null);
    const obstaclesContainerRef = useRef<Container | null>(null);
    const chatTextContainerRef = useRef<Container | null>(null);
    const [pixiAppInitialized, setPixiAppInitialized] = useState(false); 
    const [allPlayerSpritesheetsReady, setAllPlayerSpritesheetsReady] = useState(false);
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuthStore();
    const [serverMessages, setServerMessages] = useState<string[]>([]);
    const [initialPlayerDataSet, setInitialPlayerDataSet] = useState(false); 
    const [isRoomNavigatorOpen, setIsRoomNavigatorOpen] = useState(false);
    const [isFriendsOpen, setIsFriendsOpen] = useState(false); 
    const { roomId } = useParams<{ roomId: string }>(); 
    const navigate = useNavigate();
    const [otherPlayersData, setOtherPlayersData] = useState<Record<string, PlayerDataFromServer>>({}); // 🔥 AÑADIR: Para datos crudos
    const [serverConfirmedPlayerPos, setServerConfirmedPlayerPos] = useState<PlayerDataFromServer | null>(null);
    const [mainPlayerCurrentPath, setMainPlayerCurrentPath] = useState<WorldCoordinates[] | null>(null);
    const mainPlayerPathIndexRef = useRef<number>(0);
    const [otherPlayers, setOtherPlayers] = useState<Record<string, PlayerState>>({});
    const otherPlayersRef = useRef(otherPlayers);
    useEffect(() => { otherPlayersRef.current = otherPlayers; }, [otherPlayers]);
    const mainPlayerDataRef = useRef<PlayerState | null>(null);
    const [isFriendsPanelOpen, setIsFriendsPanelOpen] = useState(false);
    const [chattingWithFriend, setChattingWithFriend] = useState<Friend | null>(null);
    const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
    const [isCatalogOpen, setIsCatalogOpen] = useState(false); // 🔥 NUEVO ESTADO
    const [isInventoryOpen, setIsInventoryOpen] = useState(false); // 🔥 NUEVO ESTADO
    const [selectedItemForPlacement, setSelectedItemForPlacement] = useState<PlayerInventoryItemClient | null>(null);
    const [isPlacementModeActive, setIsPlacementModeActive] = useState(false);
    const [roomPlacedItems, setRoomPlacedItems] = useState<Record<string, RoomPlacedItemClient & { sprite?: DisplayObject }>>({});
    const placementPreviewSpriteRef = useRef<Sprite | null>(null);
    const [selectedItemTexture, setSelectedItemTexture] = useState<Texture | null>(null);
    const itemTexturesCacheRef = useRef<Record<string, Texture>>({});
    const roomItemsContainerRef = useRef<Container | null>(null);
    const [currentRoomDetails, setCurrentRoomDetails] = useState<RoomDetailsClient | null>(null);
    const currentUser = useAuthStore(state => state.user);
    const [mapGridData, setMapGridData] = useState<MapGridData | null>(null);
    const [chatInput, setChatInput] = useState<string>('');
    const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);

    const canPlayerClickMoveRef = useRef(false);
    useEffect(() => { canPlayerClickMoveRef.current = !!serverConfirmedPlayerPos; }, [serverConfirmedPlayerPos]);

    const mainPlayerCurrentPathForLoopRef = useRef(mainPlayerCurrentPath);
    useEffect(() => { mainPlayerCurrentPathForLoopRef.current = mainPlayerCurrentPath; }, [mainPlayerCurrentPath]);

    const [assetsLoaded, setAssetsLoaded] = useState(false);
    const currentlyLoadingStylesRef = useRef(new Set<string>()); 
    const [refreshTrigger, setRefreshTrigger] = useState(0); 

    const handleGameInitialSetup = useCallback((data: {
        playerData: PlayerDataFromServer;
        mapGrid: MapGridData;
        existingPlayers: PlayerDataFromServer[];
        roomId: string;         
        roomName: string;       
        hostUserId: string;    
        placedItems?: RoomPlacedItemClient[]; 

    }) => {
       
        setServerConfirmedPlayerPos(data.playerData); 
        setMainPlayerCurrentPath(null);
        mainPlayerPathIndexRef.current = 0;
        setMapGridData(data.mapGrid);
        setCurrentRoomDetails({ 
            id: data.roomId, 
            name: data.roomName,
            hostUserId: data.hostUserId 
        });
        const initialOtherPlayersData: Record<string, PlayerState> = {};
               data.existingPlayers.forEach(pData => {
                   if (pData.characterId !== data.playerData.characterId) {
                       initialOtherPlayersData[pData.characterId] = {
                           ...pData,
                           container: new Container(),
                           facingDirection: 'down',
                       };
                   }
               });
    setOtherPlayers(initialOtherPlayersData); 
    if (data.placedItems && Array.isArray(data.placedItems)) {
        console.log(`handleGameInitialSetup: Recibidos ${data.placedItems.length} objetos de sala.`);
        const initialPlacedItemsMap: Record<string, RoomPlacedItemClient & { sprite?: DisplayObject }> = {};
        for (const item of data.placedItems) {
            initialPlacedItemsMap[item.id] = { ...item, sprite: undefined }; 
        }
        setRoomPlacedItems(initialPlacedItemsMap);
    } else {
        console.log("handleGameInitialSetup: No se recibieron objetos de sala o el formato es incorrecto.");
        setRoomPlacedItems({}); 
    }
    setInitialPlayerDataSet(true); 
    }, []); 
    const handlePlayerAppearanceChanged = useCallback((data: {
    characterId: string;
    username?: string; 
    bodyStyle?: string;
    hairStyle?: string;
    shirtStyle?: string;
    pantsStyle?: string;
}) => {
    if (data.characterId === serverConfirmedPlayerPos?.characterId) {
        setServerConfirmedPlayerPos(prev => {
            if (!prev || prev.characterId !== data.characterId) return prev;

            let changed = false;
            const newState = { ...prev }; 
            if (data.bodyStyle !== undefined && newState.bodyStyle !== data.bodyStyle) {
                newState.bodyStyle = data.bodyStyle;
                changed = true;
            }
            if (data.hairStyle !== undefined && newState.hairStyle !== data.hairStyle) {
                newState.hairStyle = data.hairStyle;
                changed = true;
            }
            if (data.shirtStyle !== undefined && newState.shirtStyle !== data.shirtStyle) {
                newState.shirtStyle = data.shirtStyle;
                changed = true;
            }
            if (data.pantsStyle !== undefined && newState.pantsStyle !== data.pantsStyle) {
                newState.pantsStyle = data.pantsStyle;
                changed = true;
            }

            if (changed) {
                console.log("CLIENTE: Actualizando serverConfirmedPlayerPos por 'player_appearance_changed'", newState);
                return newState;
            }
            return prev;
        });
    } else {
        setOtherPlayers(prev => {
            const playerToUpdate = prev[data.characterId];
            if (playerToUpdate) {
                let changed = false;
                const updatedPlayer = { ...playerToUpdate };

                if (data.bodyStyle !== undefined && updatedPlayer.bodyStyle !== data.bodyStyle) {
                    updatedPlayer.bodyStyle = data.bodyStyle;
                    changed = true;
                }
                if (data.hairStyle !== undefined && updatedPlayer.hairStyle !== data.hairStyle) {
                    updatedPlayer.hairStyle = data.hairStyle;
                    changed = true;
                }
                if (data.shirtStyle !== undefined && updatedPlayer.shirtStyle !== data.shirtStyle) {
                    updatedPlayer.shirtStyle = data.shirtStyle;
                    changed = true;
                }
                if (data.pantsStyle !== undefined && updatedPlayer.pantsStyle !== data.pantsStyle) {
                    updatedPlayer.pantsStyle = data.pantsStyle;
                    changed = true;
                }

                if (changed) {
                    console.log(`CLIENTE: Actualizando otherPlayer ${data.characterId} por 'player_appearance_changed'`, updatedPlayer);
                    return { ...prev, [data.characterId]: updatedPlayer };
                }
            }
            return prev;
        });
    }
}, [serverConfirmedPlayerPos?.characterId]);
const handleApplyWardrobeChanges = useCallback((newStyles: SelectedStyles) => {
    if (!serverConfirmedPlayerPos) return;

    console.log("CLIENTE: Aplicando nuevos estilos desde el guardarropa:", newStyles);
    socketService.emit('player_change_appearance', newStyles);
    setServerConfirmedPlayerPos(prev => {
        if (!prev) return null;
        return {
            ...prev,
            ...(newStyles.bodyStyle && prev.bodyStyle !== newStyles.bodyStyle && { bodyStyle: newStyles.bodyStyle }),
            ...(newStyles.hairStyle && prev.hairStyle !== newStyles.hairStyle && { hairStyle: newStyles.hairStyle }),
            ...(newStyles.shirtStyle && prev.shirtStyle !== newStyles.shirtStyle && { shirtStyle: newStyles.shirtStyle }),
            ...(newStyles.pantsStyle && prev.pantsStyle !== newStyles.pantsStyle && { pantsStyle: newStyles.pantsStyle }),
        };
    });
}, [serverConfirmedPlayerPos]);

 const handleSelectItem = (item: PlayerInventoryItemClient) => {
       if (!amIHost) { 
            console.warn("GamePage: Intento de seleccionar item para colocar por un no-host.");
            return;
        }
        console.log("GamePage: Item seleccionado para colocar:", item.catalogItem.name);
        setSelectedItemForPlacement(item);
        setIsPlacementModeActive(true);
    };
     const handleMyPlayerMovePath = useCallback((data: { path: WorldCoordinates[] }) => {
           if (data.path && data.path.length > 0) {
               const mainPlayer = mainPlayerDataRef.current;
               if (mainPlayer?.container && data.path.length > 1 &&
                   Math.abs(mainPlayer.container.x - data.path[0].x) < PLAYER_SPEED &&
                   Math.abs(mainPlayer.container.y - data.path[0].y) < PLAYER_SPEED) {
                   setMainPlayerCurrentPath(data.path.slice(1));
               } else {
                   setMainPlayerCurrentPath(data.path);
               }
               mainPlayerPathIndexRef.current = 0;
           }
       }, []);
   

const handleNewPlayerJoined = useCallback((pData: PlayerDataFromServer) => {
    const currentPlayerCharacterId = mainPlayerDataRef.current?.characterId || serverConfirmedPlayerPos?.characterId;
    console.log(`CLIENTE (A): handleNewPlayerJoined para ${pData.username} (ID: ${pData.characterId}). Mi CharID: ${currentPlayerCharacterId}`);

    if (pData.characterId === currentPlayerCharacterId) {
        console.log(`CLIENTE (A): handleNewPlayerJoined es para mí mismo, ignorando.`);
        return;
    }

    setOtherPlayers(prev => {
        const existingPlayerState = prev[pData.characterId]; 
        let newOtherPlayersState = { ...prev };

        if (existingPlayerState) {
            console.warn(`CLIENTE (A): Jugador ${pData.characterId} (B) está (re)uniéndose, PERO un estado previo (fantasma) fue encontrado. Limpiando el fantasma AHORA.`);
            if (pixiAppRef.current && existingPlayerState.container && !existingPlayerState.container.destroyed) {
                console.log(`CLIENTE (A): Destruyendo container del FANTASMA de ${pData.characterId}.`);
                existingPlayerState.container.removeChildren();
                pixiAppRef.current.stage.removeChild(existingPlayerState.container);
                existingPlayerState.container.destroy({ children: true, texture: false, basePath: false });
            }
            delete newOtherPlayersState[pData.characterId];
        }

        console.log(`CLIENTE (A): Creando nueva entrada de estado y container para jugador ${pData.characterId} (B).`);
        const newPlayerEntry: PlayerState = {
            ...pData, 
            container: new Container(), 
            facingDirection: 'down',
            currentAnimationName: 'walk_down', 
            currentPath: null,
            currentPathIndex: 0,
            chatTextObject: null,
            chatTextTimeoutId: null,
        };
        
        newOtherPlayersState = { ...newOtherPlayersState, [pData.characterId]: newPlayerEntry };
        return newOtherPlayersState;
    });
}, [serverConfirmedPlayerPos?.characterId]);

const handleOtherPlayerMoved = useCallback((data: PlayerDataFromServer & { path: WorldCoordinates[] }) => {
   if (data.characterId === serverConfirmedPlayerPos?.characterId) return;
    console.log(`CLIENT (handleOtherPlayerMoved for ${data.username}): Path RECIBIDO del servidor: ${JSON.stringify(data.path)}`); 

    console.log(`CLIENT: Evento 'other_player_moved' RECIBIDO para ${data.username} (ID: ${data.characterId}). Path:`, data.path);
            setOtherPlayers(prev => {
                const playerToUpdate = prev[data.characterId];
                if (playerToUpdate) {
                    let newPath = data.path;
                    if (playerToUpdate.container && data.path && data.path.length > 1 &&
                        Math.abs(playerToUpdate.container.x - data.path[0].x) < PLAYER_SPEED &&
                        Math.abs(playerToUpdate.container.y - data.path[0].y) < PLAYER_SPEED) {
                        newPath = data.path.slice(1);
                    }
                    return {
                        ...prev,
                        [data.characterId]: {
                            ...playerToUpdate, 
                            ...data, 
                            currentPath: newPath,
                            currentPathIndex: 0,
                        }
                    };
                }
                return prev;
            });
}, [serverConfirmedPlayerPos?.characterId]); 

const handlePlayerLeft = useCallback((data: { characterId: string; username: string }) => {
    console.log(`CLIENTE (A): handlePlayerLeft para CharacterID: ${data.characterId} (Jugador B)`);
    const app = pixiAppRef.current;

    setOtherPlayers(prev => {
        const playerToRemove = prev[data.characterId];
        if (playerToRemove) {
            console.log(`CLIENTE (A): Encontrado playerToRemove (B) en otherPlayers. Container:`, playerToRemove.container);
            if (app && playerToRemove.container && !playerToRemove.container.destroyed) {
                console.log(`CLIENTE (A): Destruyendo container de Jugador B (ID: ${data.characterId})`);
                playerToRemove.container.removeChildren(); 
                app.stage.removeChild(playerToRemove.container); 
                playerToRemove.container.destroy({ children: true, texture: false, basePath: false }); 
            } else {
                console.log(`CLIENTE (A): Container de Jugador B no encontrado, ya destruido, o app no lista.`);
            }
            
            const { [data.characterId]: _, ...rest } = prev;
            console.log(`CLIENTE (A): Jugador B (ID: ${data.characterId}) eliminado del estado otherPlayers.`);
            return rest;
        }
        console.log(`CLIENTE (A): Jugador B (ID: ${data.characterId}) no encontrado en otherPlayers para eliminar.`);
        return prev;
    });
}, []);

    const handleNewChatMessage = useCallback((data: ChatMessageData) => {
        setChatMessages(prev => [...prev.slice(-5), data]);
        const app = pixiAppRef.current;
        if (!app || !chatTextContainerRef.current || !assetsLoaded) return; 

        let speaker: PlayerState | null = null;
        let isMainPlayer = false;

        if (data.characterId === mainPlayerDataRef.current?.characterId) {
            speaker = mainPlayerDataRef.current;
            isMainPlayer = true;
        } else {
            speaker = otherPlayersRef.current[data.characterId];
        }

        if (!speaker || !speaker.container || speaker.container.destroyed || !speaker.bodySprite) return;

        if (speaker.chatTextObject && !speaker.chatTextObject.destroyed) {
            speaker.container.removeChild(speaker.chatTextObject);
            speaker.chatTextObject.destroy();
        }
        if (speaker.chatTextTimeoutId) clearTimeout(speaker.chatTextTimeoutId);

        const chatText = new Text(data.messageText, SIMPLE_CHAT_TEXT_STYLE);
        chatText.anchor.set(0.5, 1); 

        const spriteAnchorY = speaker.bodySprite.anchor.y || DEFAULT_SPRITE_ANCHOR.y;
        let yOffset = (speaker.bodySprite.height * spriteAnchorY) + 5; 
        
        if (speaker.nameTag && !speaker.nameTag.destroyed) {
            yOffset += speaker.nameTag.height + 2; 
        }
        chatText.x = 0; 
        chatText.y = -yOffset; 
        
        speaker.container.addChild(chatText); 

        const timeoutId = setTimeout(() => {
            if (chatText && !chatText.destroyed && speaker?.container && !speaker.container.destroyed) { 
                speaker.container.removeChild(chatText); 
                chatText.destroy();
            }
            const speakerToClear = isMainPlayer ? mainPlayerDataRef.current : otherPlayersRef.current[data.characterId];
            if (speakerToClear && speakerToClear.chatTextObject === chatText) {
                speakerToClear.chatTextObject = null;
                speakerToClear.chatTextTimeoutId = null;
                if (!isMainPlayer) { 
                    setOtherPlayers(prev => ({...prev})); 
                }
            }
        }, CHAT_TEXT_LIFETIME_MS);

        if (isMainPlayer && mainPlayerDataRef.current) {
            mainPlayerDataRef.current.chatTextObject = chatText;
            mainPlayerDataRef.current.chatTextTimeoutId = timeoutId;
        } else {
            setOtherPlayers(prev => { 
                const playerState = prev[data.characterId];
                if (playerState) {
                    return { ...prev, [data.characterId]: { ...playerState, chatTextObject: chatText, chatTextTimeoutId: timeoutId } };
                }
                return prev; 
            });
        }
    }, [assetsLoaded]);
    
    const handleDisconnect = useCallback((reason: string) => {
        setServerMessages(prev => [...prev.slice(-4), `Desconectado: ${reason}`]);
        setAssetsLoaded(false); 
        setServerConfirmedPlayerPos(null);
        setOtherPlayers({});
        mainPlayerDataRef.current = null;
    }, []);

const handleOpenChat = (friend: Friend) => {
    setChattingWithFriend(friend);
    setIsFriendsPanelOpen(false); 
};

const handleCloseChat = () => {
    setChattingWithFriend(null);
};

   useEffect(() => {
      if (!roomId || !isAuthenticated || !user || !socketService.socket) {
            return; 
        }
        if (isAuthenticated && user) {
            console.log("Effect 1 (Socket Core): User authenticated. Socket connected:", socketService.socket?.connected);
            if (!socketService.socket || !socketService.socket.connected) {
                console.log("Effect 1: Attempting to connect socket.");
                socketService.connect(); 
            }

        const onConnectHandler = () => {
         console.log("Effect 1: Socket connected. 'player_ready_in_room' se emitirá en Effect 5.");
        };
            
            socketService.socket?.on('connect', onConnectHandler);
            socketService.socket?.on('game_initial_setup', handleGameInitialSetup);
            socketService.socket?.on('disconnect', handleDisconnect);
 const handleRoomItemsUpdate = (data: { roomId: string; items: RoomPlacedItemClient[] }) => {
            if (data.roomId === roomId) { 
                console.log("GamePage: Recibido 'room:placed_items_update'", data.items);
                
                const newPlacedItemsMap: Record<string, RoomPlacedItemClient> = {};
                for (const item of data.items) {
                    newPlacedItemsMap[item.id] = item;
                }
                setRoomPlacedItems(prevItems => {
                   
                    const updatedItemsWithSprites: Record<string, RoomPlacedItemClient & { sprite?: DisplayObject }> = {};
                    for (const itemId in newPlacedItemsMap) {
                        updatedItemsWithSprites[itemId] = {
                            ...newPlacedItemsMap[itemId],
                            sprite: prevItems[itemId]?.sprite 
                        };
                    }
                    return updatedItemsWithSprites;
                });
            }
        };
        socketService.socket?.on('room:placed_items_update', handleRoomItemsUpdate);
        
            return () => {
                console.log("Effect 1: Cleaning up core socket listeners.");
                socketService.socket?.off('connect', onConnectHandler);
                socketService.socket?.off('game_initial_setup', handleGameInitialSetup);
                socketService.socket?.off('disconnect', handleDisconnect);
                            socketService.socket?.off('room:placed_items_update', handleRoomItemsUpdate);
            };
        } else {
            if (socketService.socket?.connected) socketService.disconnect();
            setServerConfirmedPlayerPos(null); 
            setAssetsLoaded(false); 
            setPixiAppInitialized(false);
            mainPlayerDataRef.current = null;
            setOtherPlayers({}); 
        }
    }, [isAuthenticated, user, handleGameInitialSetup, roomId, handleDisconnect]); 
    const amIHost = !!(currentUser && currentRoomDetails && currentUser.id === currentRoomDetails.hostUserId);

 
    const updatePlayerAnimation = useCallback((playerState: PlayerState | null, animationType: "idle" | "walk", facingDir: "up" | "down" | "left" | "right") => {
       if (!playerState || !playerState.container || playerState.container.destroyed) return;
   
       const baseAnimationName = `walk_${facingDir}`; 
   
       const layers: { sprite?: AnimatedSprite, styleKey?: string }[] = [
           { sprite: playerState.bodySprite, styleKey: playerState.bodyStyle },
           { sprite: playerState.hairSprite, styleKey: playerState.hairStyle },
           { sprite: playerState.shirtSprite, styleKey: playerState.shirtStyle },
           { sprite: playerState.pantsSprite, styleKey: playerState.pantsStyle },
       ];
   
       layers.forEach(layer => {
           const { sprite, styleKey } = layer;
           if (sprite && styleKey && sprite instanceof AnimatedSprite && !sprite.destroyed) {
               const sheet = loadedSpritesheets[styleKey];
               if (!sheet) {
                   sprite.stop(); 
                   return; 
               }
   
               const textures = sheet.animations[baseAnimationName];
               if (textures && textures.length > 0) {
                   if (playerState.currentAnimationName !== baseAnimationName || sprite.textures !== textures) {
                        sprite.textures = textures;
                   }
                   sprite.animationSpeed = ANIMATION_SPEEDS[baseAnimationName] || 0.15;
                   if (animationType === "walk") {
                       if (!sprite.playing) sprite.play();
                   } else { 
                       sprite.gotoAndStop(0);
                   }
               } else {
                   if (sprite.playing) sprite.stop();
                   if (sprite.totalFrames > 0) sprite.gotoAndStop(0);
               }
           }
       });
       playerState.currentAnimationName = baseAnimationName; 
       playerState.facingDirection = facingDir;
   }, [ANIMATION_SPEEDS]); 
   
 const handlePointerMove = (event: FederatedPointerEvent) => {
            if (isPlacementModeActive && placementPreviewSpriteRef.current && !placementPreviewSpriteRef.current.destroyed) {
                let newX = event.global.x;
                let newY = event.global.y;

                if (mapGridData && mapGridData.cellSize > 0) {
                    
                    const cellCenterX = Math.floor(newX / mapGridData.cellSize) * mapGridData.cellSize + mapGridData.cellSize / 2;
                    const cellCenterY = Math.floor(newY / mapGridData.cellSize) * mapGridData.cellSize + mapGridData.cellSize / 2;
                    newX = cellCenterX;
                    newY = cellCenterY;
                }
                placementPreviewSpriteRef.current.position.set(newX, newY);
            }
        };

        const handleStageClick = (event: FederatedPointerEvent) => {
            if (isPlacementModeActive && selectedItemForPlacement && placementPreviewSpriteRef.current) {
                const finalX = placementPreviewSpriteRef.current.x; 
                const finalY = placementPreviewSpriteRef.current.y;

                console.log(`GamePage: Intentando colocar "${selectedItemForPlacement.catalogItem.name}" en (${finalX}, ${finalY})`);

                if (!roomId) { 
                    console.error("GamePage: RoomID no disponible para colocar el objeto.");
                    return;
                }

                const payload = {
                    roomId: roomId,
                    playerInventoryItemId: selectedItemForPlacement.id, 
                    x: finalX,
                    y: finalY,
                    rotation: 0, 
                };

               
                socketService.socket?.emit('room:place_item', payload, (response: { success: boolean; placedItem?: any; error?: string }) => {
                    if (response.success && response.placedItem) {
                        console.log("GamePage: Objeto colocado con éxito (respuesta del servidor):", response.placedItem);
                       
                    } else {
                        console.error("GamePage: Error al colocar el objeto (respuesta del servidor):", response.error);
                    }
                });

                setIsPlacementModeActive(false);
                setSelectedItemForPlacement(null);
                setSelectedItemTexture(null); 

            } else if (canPlayerClickMoveRef.current && mainPlayerDataRef.current && !isPlacementModeActive) {
                const newPosition = event.global;
                console.log(`GamePage: Movimiento solicitado a X:${Math.round(newPosition.x)}, Y:${Math.round(newPosition.y)}`);
                socketService.emit('player_move_request', { targetX: Math.round(newPosition.x), targetY: Math.round(newPosition.y) });
            }
        };
 const gameLoop = (delta: number) => { 
        const deltaTime = delta; 
        
        const mainPlayer = mainPlayerDataRef.current;
        const mainPath = mainPlayerCurrentPathForLoopRef.current;

        if (mainPlayer && mainPlayer.container && !mainPlayer.container.destroyed) {
            if (mainPath && mainPath.length > 0 && mainPlayerPathIndexRef.current < mainPath.length) {
                const targetPos = mainPath[mainPlayerPathIndexRef.current];
                if (targetPos) {
                    const dx = targetPos.x - mainPlayer.container.x;
                    const dy = targetPos.y - mainPlayer.container.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const moveAmount = PLAYER_SPEED * deltaTime;
                    let newFacingDirection = mainPlayer.facingDirection;

                    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                        if (Math.abs(dx) > Math.abs(dy)) {
                            newFacingDirection = dx < 0 ? 'left' : 'right';
                        } else {
                            newFacingDirection = dy < 0 ? 'down' : 'up'; // Moonwalk fix
                        }
                    }
                    updatePlayerAnimation(mainPlayer, "walk", newFacingDirection);

                    if (distance < moveAmount || distance < 0.01) {
                        mainPlayer.container.x = targetPos.x;
                        mainPlayer.container.y = targetPos.y;
                        mainPlayerPathIndexRef.current++;
                        if (mainPlayerPathIndexRef.current >= mainPath.length) {
                            setMainPlayerCurrentPath(null);
                            mainPlayerPathIndexRef.current = 0;
                            updatePlayerAnimation(mainPlayer, "idle", newFacingDirection);
                            setServerConfirmedPlayerPos(prev => prev ? { ...prev, x: targetPos.x, y: targetPos.y } : null); 
                        }
                    } else {
                        mainPlayer.container.x += (dx / distance) * moveAmount;
                        mainPlayer.container.y += (dy / distance) * moveAmount;
                    }
                }
            } else {
                if (mainPlayer.bodySprite) {
                    updatePlayerAnimation(mainPlayer, "idle", mainPlayer.facingDirection);
                }
            }
            if (mainPlayer.chatTextObject && !mainPlayer.chatTextObject.destroyed && mainPlayer.chatTextObject.visible && mainPlayer.container && mainPlayer.bodySprite) {
                mainPlayer.chatTextObject.x = 0;
                let yOffset = (mainPlayer.bodySprite.height * (mainPlayer.bodySprite.anchor?.y || 0.5)) + 15;
                if (mainPlayer.nameTag && !mainPlayer.nameTag.destroyed) {
                    yOffset += mainPlayer.nameTag.height + 2;
                }
                mainPlayer.chatTextObject.y = -yOffset;
            }
        }

        const currentOtherPlayers = otherPlayersRef.current;
        for (const playerId in currentOtherPlayers) {
            const otherPlayer = currentOtherPlayers[playerId];
            if (otherPlayer.container && !otherPlayer.container.destroyed) {
                if (otherPlayer.currentPath && otherPlayer.currentPath.length > 0 &&
                    otherPlayer.currentPathIndex !== undefined && otherPlayer.currentPathIndex < otherPlayer.currentPath.length) {
                    const targetPos = otherPlayer.currentPath[otherPlayer.currentPathIndex];
                    if (targetPos) {
                        const dx = targetPos.x - otherPlayer.container.x;
                        const dy = targetPos.y - otherPlayer.container.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const moveAmount = PLAYER_SPEED * deltaTime;
                        let newFacingDirection = otherPlayer.facingDirection;

                        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                            if (Math.abs(dx) > Math.abs(dy)) { newFacingDirection = dx < 0 ? 'left' : 'right'; }
                            else { newFacingDirection = dy < 0 ? 'down' : 'up'; } // Moonwalk fix
                        }
                        updatePlayerAnimation(otherPlayer, "walk", newFacingDirection);

                        if (distance < moveAmount || distance < 0.01) {
                            otherPlayer.container.x = targetPos.x;
                            otherPlayer.container.y = targetPos.y;
                            if(otherPlayer.currentPathIndex !== undefined) otherPlayer.currentPathIndex++; 
                            if (otherPlayer.currentPathIndex !== undefined && otherPlayer.currentPathIndex >= otherPlayer.currentPath.length) {
                                const playerInRef = otherPlayersRef.current[playerId];
                                if (playerInRef) {
                                    playerInRef.currentPath = null;
                                    playerInRef.currentPathIndex = 0; 
                                    updatePlayerAnimation(playerInRef, "idle", newFacingDirection);
                                }
                            }
                        } else {
                            otherPlayer.container.x += (dx / distance) * moveAmount;
                            otherPlayer.container.y += (dy / distance) * moveAmount;
                        }
                    }
                } else {
                    if (otherPlayer.bodySprite) {
                        updatePlayerAnimation(otherPlayer, "idle", otherPlayer.facingDirection);
                    }
                }

                if (otherPlayer.chatTextObject && !otherPlayer.chatTextObject.destroyed && otherPlayer.chatTextObject.visible && otherPlayer.container && otherPlayer.bodySprite) {
                    otherPlayer.chatTextObject.x = 0;
                    let yOffset = (otherPlayer.bodySprite.height * (otherPlayer.bodySprite.anchor?.y || 0.5)) + 15;
                    if (otherPlayer.nameTag && !otherPlayer.nameTag.destroyed) {
                        yOffset += otherPlayer.nameTag.height + 2;
                    }
                    otherPlayer.chatTextObject.y = -yOffset;
                }
            }
        }
    }; 

const setupPlayerSprite = useCallback((app: Application, playerData: PlayerDataFromServer, existingPlayerState?: PlayerState): PlayerState | null => {
    const currentFacingDirection = existingPlayerState?.facingDirection || 'up';
    const currentAnimationName = existingPlayerState?.currentAnimationName || `walk_${currentFacingDirection}`;

    let playerContainer = existingPlayerState?.container;
    let isNewContainer = false;

    // 1. Manejo del Container Principal del Jugador
    if (!playerContainer || playerContainer.destroyed) {
        playerContainer = new Container();
        playerContainer.name = `playerContainer_${playerData.characterId}`; 
        if (app.stage && !playerContainer.parent) {
             app.stage.addChild(playerContainer);
        }
        isNewContainer = true;
        console.log(`🔥 SETUP_PLAYER_SPRITE (${playerData.username}): Container ${isNewContainer ? 'CREADO' : 'reutilizado'}.`);
    } else if (!playerContainer.parent && app.stage) {
        app.stage.addChild(playerContainer); // Añadir si existía pero no estaba en el stage
    }

    playerContainer.x = playerData.x;
    playerContainer.y = playerData.y;
    playerContainer.visible = true;
    playerContainer.sortableChildren = true;

    const setupLayer = (
            layerNameForLog: string, // Solo para logging
            styleKeyFromData: string | undefined,
            existingSpriteOnState: AnimatedSprite | undefined,
            defaultAnimName: string,
            zIndex: number
        ): AnimatedSprite | undefined => {
            console.log(`🔥   SETUP_LAYER (${playerData.username} - ${layerNameForLog}): styleKey='${styleKeyFromData}', existingSpriteName='${existingSpriteOnState?.name}', anim='${defaultAnimName}'`);
    
            if (!styleKeyFromData || styleKeyFromData.endsWith("_none") || styleKeyFromData === "" || !STYLE_ASSET_MAPPING[styleKeyFromData]) {
                if (existingSpriteOnState && !existingSpriteOnState.destroyed) {
                    console.log(`🔥     SETUP_LAYER (${layerNameForLog}): No hay styleKey o es _none. Destruyendo sprite existente '${existingSpriteOnState.name}'.`);
                    playerContainer!.removeChild(existingSpriteOnState);
                    existingSpriteOnState.destroy();
                }
                return undefined;
            }
    
            const sheet = loadedSpritesheets[styleKeyFromData];
            console.log(`🔥     SETUP_LAYER (${layerNameForLog}): Buscando sheet para '${styleKeyFromData}'. Encontrado: ${!!sheet}`);
    
            if (!sheet) {
                if (existingSpriteOnState && !existingSpriteOnState.destroyed && existingSpriteOnState.name !== styleKeyFromData) {
                    console.log(`🔥     SETUP_LAYER (${layerNameForLog}): Sheet para '${styleKeyFromData}' no listo Y el estilo cambió del viejo '${existingSpriteOnState.name}'. Destruyendo viejo sprite.`);
                    playerContainer!.removeChild(existingSpriteOnState);
                    existingSpriteOnState.destroy();
                    return undefined;
                }
                console.warn(`🔥     SETUP_LAYER (${layerNameForLog}): Atlas para '${styleKeyFromData}' no disponible aún. Se mantendrá el sprite existente si es del mismo estilo, o nada.`);
                return (existingSpriteOnState && !existingSpriteOnState.destroyed && existingSpriteOnState.name === styleKeyFromData) ? existingSpriteOnState : undefined;
            }
    
            let sprite = existingSpriteOnState;
    
            if (!sprite || sprite.name !== styleKeyFromData || sprite.destroyed) {
                if (sprite && !sprite.destroyed) {
                    console.log(`🔥     SETUP_LAYER (${layerNameForLog}): Recreando sprite. Estilo viejo: '${sprite.name}', Estilo nuevo: '${styleKeyFromData}'.`);
                    playerContainer!.removeChild(sprite);
                    sprite.destroy();
                }
                
                const textures = sheet.animations[defaultAnimName];
                if (textures && textures.length > 0) {
                    sprite = new AnimatedSprite(textures);
                    sprite.name = styleKeyFromData;
                    sprite.anchor.set(DEFAULT_SPRITE_ANCHOR.x, DEFAULT_SPRITE_ANCHOR.y);
                } else {
                    if (sprite && !sprite.destroyed) sprite.destroy();
                    return undefined;
                }
            }
            
            if (sprite) {
                sprite.scale.set(SPRITE_SCALE_FACTOR);
                sprite.zIndex = zIndex;
                if (!sprite.parent) {
                     playerContainer!.addChild(sprite);
                     console.log(`🔥     SETUP_LAYER (${layerNameForLog}): Sprite AÑADIDO al contenedor para '${styleKeyFromData}'.`);
                } else if (sprite.parent !== playerContainer) {
                    sprite.removeFromParent();
                    playerContainer!.addChild(sprite);
                    console.log(`🔥     SETUP_LAYER (${layerNameForLog}): Sprite MOVIDO al contenedor correcto para '${styleKeyFromData}'.`);
                }
            }
            return sprite;
        };
        
        const bodySprite = setupLayer("body", playerData.bodyStyle, existingPlayerState?.bodySprite, currentAnimationName, 0);
        const pantsSprite = setupLayer("pants", playerData.pantsStyle, existingPlayerState?.pantsSprite, currentAnimationName, 1);
        const shirtSprite = setupLayer("shirt", playerData.shirtStyle, existingPlayerState?.shirtSprite, currentAnimationName, 2);
        const hairSprite = setupLayer("hair", playerData.hairStyle, existingPlayerState?.hairSprite, currentAnimationName, 3);
    
        const activeSprites = [bodySprite, pantsSprite, shirtSprite, hairSprite].filter(Boolean) as AnimatedSprite[];
        const currentChildren = [...playerContainer.children]; 
    
        currentChildren.forEach(child => { 
            if (child !== existingPlayerState?.nameTag && 
                (child === existingPlayerState?.bodySprite && !bodySprite ||
                 child === existingPlayerState?.pantsSprite && !pantsSprite ||
                 child === existingPlayerState?.shirtSprite && !shirtSprite ||
                 child === existingPlayerState?.hairSprite && !hairSprite)
            ) {
                if (!child.destroyed) {
                    playerContainer.removeChild(child);
                }
            }
        });
        activeSprites.forEach(s => { 
            if (!s.parent) playerContainer.addChild(s);
        });
        playerContainer.sortChildren();
    
        let nameTag = existingPlayerState?.nameTag;
        if (!nameTag || nameTag.destroyed) {
            nameTag = new Text(playerData.username, NAME_TAG_STYLE);
            nameTag.anchor.set(0.5, 1);
        } else { nameTag.text = playerData.username; }
        if(!nameTag.parent) playerContainer.addChild(nameTag);
        nameTag.zIndex = 10; 
        playerContainer.sortChildren(); 
    
        const primarySpriteForAnchor = bodySprite || shirtSprite || pantsSprite || hairSprite;
        const nameTagAnchorYOffset = primarySpriteForAnchor 
            ? primarySpriteForAnchor.height * (primarySpriteForAnchor.anchor.y ?? DEFAULT_SPRITE_ANCHOR.y)
            : (PLAYER_RADIUS * SPRITE_SCALE_FACTOR);
        if (nameTag) nameTag.y = -nameTagAnchorYOffset - 2;
    
    
            if (!bodySprite && !pantsSprite && !shirtSprite && !hairSprite) {
                let fallbackGfx = playerContainer.getChildByName("player_fallback_gfx") as Graphics | null;
                if (!fallbackGfx) { //  fallback 
                    const childrenToKeep = [nameTag].filter(Boolean);
                    playerContainer.removeChildren(); 
                    childrenToKeep.forEach(c => playerContainer.addChild(c!));
    
                    fallbackGfx = new Graphics().beginFill(playerData.characterId === mainPlayerDataRef.current?.characterId ? 0x3498db : OTHER_PLAYER_COLOR).drawCircle(0, 0, PLAYER_RADIUS * SPRITE_SCALE_FACTOR).endFill();
                    fallbackGfx.name = "player_fallback_gfx";
                    playerContainer.addChildAt(fallbackGfx, 0); 
                }
                if (nameTag) nameTag.y = -(PLAYER_RADIUS * SPRITE_SCALE_FACTOR) - 2;
            } else {
                const fallbackGfx = playerContainer.getChildByName("player_fallback_gfx");
                if (fallbackGfx) { // Si hay capas de sprite, quitar el fallback
                    playerContainer.removeChild(fallbackGfx);
                    fallbackGfx.destroy();
                }
            }
            
            const finalPlayerState: PlayerState = {
                ...playerData,
                container: playerContainer, 
                bodySprite, hairSprite, shirtSprite, pantsSprite, nameTag,
                facingDirection: currentFacingDirection, 
                currentAnimationName: currentAnimationName,
                currentPath: existingPlayerState?.currentPath || null,
                currentPathIndex: existingPlayerState?.currentPathIndex || 0,
                chatTextObject: existingPlayerState?.chatTextObject || null,
                chatTextTimeoutId: existingPlayerState?.chatTextTimeoutId || null,
            };
           console.log(`SETUP_PLAYER_SPRITE para ${playerData.username} RESULTADO:`, {
            hasBody: !!finalPlayerState.bodySprite, bodyStyle: finalPlayerState.bodySprite?.name,
            hasHair: !!finalPlayerState.hairSprite, hairStyle: finalPlayerState.hairSprite?.name,
            hasShirt: !!finalPlayerState.shirtSprite, shirtStyle: finalPlayerState.shirtSprite?.name, 
            hasPants: !!finalPlayerState.pantsSprite, pantsStyle: finalPlayerState.pantsSprite?.name,
        });
            updatePlayerAnimation(finalPlayerState, "idle", currentFacingDirection);
            return finalPlayerState;
        }, [updatePlayerAnimation]);

useEffect(() => {
        console.log("GamePage: roomId o location.key cambió. RoomId:", roomId);
        if (roomId && isAuthenticated && user) {
            console.log(`GamePage: Preparando para cargar sala con ID: ${roomId}`);
            setIsRoomNavigatorOpen(false); 
            setIsCatalogOpen(false); 
            setIsInventoryOpen(false);
             setIsWardrobeOpen(false);
            setInitialPlayerDataSet(false); 
            setAssetsLoaded(false); 
            setPixiAppInitialized(false); 
            setServerConfirmedPlayerPos(null);
             setOtherPlayers({}); 
             setRoomPlacedItems({}); 
             setCurrentRoomDetails(null);
            setSelectedItemForPlacement(null);
             setIsPlacementModeActive(false); 
             setSelectedItemTexture(null);
        } else if (!roomId && isAuthenticated && user) {
            console.log("GamePage (ViewManager Effect): No hay roomId. Preparando para HotelView.");
            setInitialPlayerDataSet(false); 
            setAssetsLoaded(false);
        }
    }, [roomId, isAuthenticated, user, location.key]);
    
    useEffect(() => {
        console.log(
            "GamePage (PixiAppLifecycle Effect): Evaluando. roomId:", roomId,
            "assetsLoaded:", assetsLoaded, "isAuthenticated:", isAuthenticated,
            "initialPlayerDataSet:", initialPlayerDataSet, "mapGridData:", !!mapGridData,
            "pixiAppInitialized (estado actual):", pixiAppInitialized
        );

        const conditionsMetForPixi = roomId && assetsLoaded && isAuthenticated && pixiContainerRef.current && initialPlayerDataSet && mapGridData;

        if (conditionsMetForPixi) {
            if (!pixiAppRef.current || pixiAppRef.current.stage?.destroyed) {
                console.log("GamePage (PixiAppLifecycle Effect): Creando NUEVA PIXI.Application para sala:", roomId);
                if (pixiContainerRef.current) pixiContainerRef.current.innerHTML = '';
                
                const app = new Application({ resizeTo: pixiContainerRef.current! || window, backgroundColor: 0x22272e, antialias: true });
                pixiAppRef.current = app;
                if (pixiContainerRef.current) {
                pixiContainerRef.current.appendChild(app.view as HTMLCanvasElement);
                pixiContainerRef.current.style.width = '100%';
                pixiContainerRef.current.style.height = '100%';
                pixiContainerRef.current.style.display = 'block';
                (app.view as HTMLCanvasElement).style.width = '100%';
                (app.view as HTMLCanvasElement).style.height = '100%';
            }
                pixiContainerRef.current!.appendChild(app.view as HTMLCanvasElement);

                app.stage.eventMode = 'static';
                app.stage.hitArea = app.screen;

                groundRef.current = new Graphics(); app.stage.addChild(groundRef.current);
                obstaclesContainerRef.current = new Container(); app.stage.addChild(obstaclesContainerRef.current);
                roomItemsContainerRef.current = new Container(); roomItemsContainerRef.current.name = "RoomItemsContainer"; app.stage.addChild(roomItemsContainerRef.current);
                chatTextContainerRef.current = new Container(); app.stage.addChild(chatTextContainerRef.current);
                welcomeTextRef.current = new Text('', NAME_TAG_STYLE); 
                welcomeTextRef.current.anchor.set(0.5);
                if(app.screen) welcomeTextRef.current.position.set(app.screen.width / 2, app.screen.height / 2);
                app.stage.addChild(welcomeTextRef.current);
                
                app.ticker.add(gameLoop);
                
                setPixiAppInitialized(true);
                console.log("GamePage (PixiAppLifecycle Effect): NUEVA PIXI App inicializada y setPixiAppInitialized(true).");
            } else {
                console.log("GamePage (PixiAppLifecycle Effect): PIXI App ya existe para sala:", roomId);
                if (!pixiAppInitialized) { 
                     setPixiAppInitialized(true);
                     console.log("GamePage (PixiAppLifecycle Effect): App existente, se fuerza pixiAppInitialized a true.");
                }
                if (pixiAppRef.current && !pixiAppRef.current.ticker.started) {
                    pixiAppRef.current.ticker.start();
                }
            }
        } else { 
            if (pixiAppRef.current && !pixiAppRef.current.stage?.destroyed) {
                console.log("GamePage (PixiAppLifecycle Effect): Condiciones no cumplidas o !roomId. Destruyendo PIXI App existente.");
                if (pixiAppRef.current.ticker) pixiAppRef.current.ticker.remove(gameLoop);
                   const urlsToUnloadFromPixiAssets: string[] = [];
                    for (const key in loadedSpritesheets) {
                        if (STYLE_ASSET_MAPPING[key]) {
                            urlsToUnloadFromPixiAssets.push(STYLE_ASSET_MAPPING[key]);
                        }
                    }
                pixiAppRef.current.destroy(true, { children: true, texture: true, basePath: true }); 
                pixiAppRef.current = null;
                if (pixiContainerRef.current) pixiContainerRef.current.innerHTML = '';
                setPixiAppInitialized(false);

                groundRef.current = null; obstaclesContainerRef.current = null; roomItemsContainerRef.current = null;
                chatTextContainerRef.current = null; welcomeTextRef.current = null; placementPreviewSpriteRef.current = null;
                mainPlayerDataRef.current = null;
                setOtherPlayers({}); 

                console.log("GamePage (PixiAppLifecycle Effect): Limpiando caché 'loadedSpritesheets'.");
                 for (const key in loadedSpritesheets) { delete loadedSpritesheets[key]; }
        itemTexturesCacheRef.current = {};

        if (urlsToUnloadFromPixiAssets.length > 0) {
            console.log("GamePage (PixiAppLifecycle Effect): Intentando Assets.unload para:", urlsToUnloadFromPixiAssets);
            urlsToUnloadFromPixiAssets.forEach(url => {
                Assets.unload(url).catch(e => console.warn(`Error en Assets.unload para ${url} durante limpieza:`, e));
            });
        }
    }
}
        return () => {
            // Limpieza si GamePage se desmonta mientras una app está activa.
            if (pixiAppRef.current && !pixiAppRef.current.stage?.destroyed && !roomId) { 
                console.log("GamePage (PixiAppLifecycle Effect Cleanup on UNMOUNT): Destruyendo PIXI App.");
                if (pixiAppRef.current.ticker) pixiAppRef.current.ticker.remove(gameLoop);
                pixiAppRef.current.destroy(true, { children: true, texture: true, basePath: true });
                pixiAppRef.current = null;
                setPixiAppInitialized(false);
            }
        };
    }, [roomId, assetsLoaded, isAuthenticated, initialPlayerDataSet, mapGridData, gameLoop]); 

useEffect(() => {
    const app = pixiAppRef.current;
    if (!app || !app.stage || !initialPlayerDataSet) { 
        return;
    }
    if (!roomItemsContainerRef.current || roomItemsContainerRef.current.destroyed) {
        roomItemsContainerRef.current = new Container();
        if (roomItemsContainerRef.current) {
            roomItemsContainerRef.current.name = "RoomItemsContainer";
            app.stage.addChild(roomItemsContainerRef.current);
        }
       
    }
    const container = roomItemsContainerRef.current;

    const currentItemIdsInState = Object.keys(roomPlacedItems);
    const renderedSpriteIds = container
        ? container.children
            .map(child => child.name)
            .filter((name): name is string => typeof name === 'string' && name !== '')
        : []; 

    for (const renderedId of renderedSpriteIds) {
        if (!roomPlacedItems[renderedId]) {
            if (container) {
                const spriteToDestroy = container.getChildByName(renderedId);
                if (spriteToDestroy) {
                    spriteToDestroy.destroy({ children: true }); 
                }
            }
        }
    }

    for (const itemId in roomPlacedItems) {
        const itemData = roomPlacedItems[itemId];
        let itemSprite: Sprite | Container | null = null;
        if (container) {
            itemSprite = container.getChildByName(itemId) as Sprite | Container | null;
        }

        if (!itemTexturesCacheRef.current[itemData.catalogItem.assetKey]) {
            const assetUrl = `/assets/items_catalog/${itemData.catalogItem.assetKey}.png`;
            console.log(`GamePage (Pixi Render): Cargando asset para item ${itemData.catalogItem.name}: ${assetUrl}`);
            Assets.load(assetUrl).then((texture: Texture) => {
                itemTexturesCacheRef.current[itemData.catalogItem.assetKey] = texture;
               
                setRoomPlacedItems(prev => ({
                    ...prev,
                    [itemId]: { ...prev[itemId] } 
                }));
            }).catch(err => {
                console.error(`Error cargando asset ${assetUrl}:`, err);
                itemTexturesCacheRef.current[itemData.catalogItem.assetKey] = Texture.WHITE; 
                 setRoomPlacedItems(prev => ({
                    ...prev,
                    [itemId]: { ...prev[itemId] } 
                }));
            });
        }

        const texture = itemTexturesCacheRef.current[itemData.catalogItem.assetKey];

        if (texture) { 
            if (!itemSprite) { 
                console.log(`GamePage (Pixi Render): Creando sprite para item ${itemData.catalogItem.name} (ID: ${itemId})`);
                itemSprite = new Sprite(texture);
                itemSprite.name = itemId; 
                if (itemSprite instanceof Sprite) {
                    itemSprite.anchor.set(0.5); 
                }
                
                if (container) {
                    container.addChild(itemSprite);
                }
        
            }
            itemSprite.position.set(itemData.x, itemData.y);
            itemSprite.rotation = (itemData.rotation || 0) * (Math.PI / 180); // Convertir grados a radianes
            itemSprite.zIndex = itemData.zIndex || 0; 
            itemSprite.visible = true;
        } else if (itemSprite) {
             itemSprite.visible = false;
        }
    }
    
    if (container) {
        container.sortChildren();
    }

}, [roomPlacedItems, initialPlayerDataSet, pixiAppRef.current]);
   useEffect(() => {
        const bodyStyleToLoad = serverConfirmedPlayerPos?.bodyStyle;
        console.log(
            `EFFECT 2 (Main Body): Entrando. Auth=${isAuthenticated}, BodyStyle='${bodyStyleToLoad}', AssetsLoaded=${assetsLoaded}, LoadingRefHasBody=${currentlyLoadingStylesRef.current.has(bodyStyleToLoad || '')}`
        );

        if (isAuthenticated && bodyStyleToLoad) {
            if (loadedSpritesheets[bodyStyleToLoad]) {
                console.log(`EFFECT 2: bodyStyle '${bodyStyleToLoad}' ya está en loadedSpritesheets.`);
                if (!assetsLoaded) {
                    console.log("EFFECT 2: Marcando assetsLoaded = true (desde caché de bodyStyle).");
                    setAssetsLoaded(true);
                }
            } else {
                if (!currentlyLoadingStylesRef.current.has(bodyStyleToLoad)) {
                    console.log(`EFFECT 2: bodyStyle '${bodyStyleToLoad}' NO en caché, NO en currentlyLoadingStylesRef. Iniciando carga...`);
                    currentlyLoadingStylesRef.current.add(bodyStyleToLoad);
                    loadStyleAtlas(bodyStyleToLoad).then((sheet) => {
                        if (sheet) {
                            console.log(`EFFECT 2: ÉXITO cargando bodyStyle '${bodyStyleToLoad}'. Estableciendo assetsLoaded = true.`);
                            setAssetsLoaded(true);
                        } else {
                            console.error(`EFFECT 2: FALLO al cargar bodyStyle '${bodyStyleToLoad}' (sheet es null). Estableciendo assetsLoaded = false.`);
                            setAssetsLoaded(false); 
                        }
                    }).catch(err => {
                        console.error(`EFFECT 2: EXCEPCIÓN al cargar bodyStyle '${bodyStyleToLoad}'. Estableciendo assetsLoaded = false. Error:`, err);
                        setAssetsLoaded(false);
                    }).finally(() => {
                        currentlyLoadingStylesRef.current.delete(bodyStyleToLoad);
                        console.log(`EFFECT 2: Finalizada carga (o intento) para bodyStyle '${bodyStyleToLoad}'. LoadingRef:`, Array.from(currentlyLoadingStylesRef.current));
                    });
                } else {
                    console.log(`EFFECT 2: bodyStyle '${bodyStyleToLoad}' no cargado, pero ya está en currentlyLoadingStylesRef o assetsLoaded ya es true. No se actúa aquí para bodyStyle.`);
                }
            }
        } else if (!isAuthenticated && assetsLoaded) { 
            console.log("EFFECT 2: Usuario no autenticado o sin bodyStyle, pero assetsLoaded era true. Reseteando assetsLoaded = false.");
            setAssetsLoaded(false);
        } else {
             console.log("EFFECT 2: Condiciones iniciales no cumplidas (no auth o no bodyStyle).");
        }
    }, [isAuthenticated, serverConfirmedPlayerPos?.bodyStyle, assetsLoaded]);


     useEffect(() => {
        if (!isAuthenticated || !assetsLoaded || !user) { 
            setAllPlayerSpritesheetsReady(false); 
            return;
        }

        const stylesToLoad = new Set<string>();
        if (serverConfirmedPlayerPos?.bodyStyle) stylesToLoad.add(serverConfirmedPlayerPos.bodyStyle);
        if (serverConfirmedPlayerPos?.hairStyle) stylesToLoad.add(serverConfirmedPlayerPos.hairStyle);
        if (serverConfirmedPlayerPos?.shirtStyle) stylesToLoad.add(serverConfirmedPlayerPos.shirtStyle);
        if (serverConfirmedPlayerPos?.pantsStyle) stylesToLoad.add(serverConfirmedPlayerPos.pantsStyle);

        Object.values(otherPlayersRef.current).forEach(player => {
            if (player.bodyStyle) stylesToLoad.add(player.bodyStyle);
            if (player.hairStyle) stylesToLoad.add(player.hairStyle);
            if (player.shirtStyle) stylesToLoad.add(player.shirtStyle);
            if (player.pantsStyle) stylesToLoad.add(player.pantsStyle);
        });

        const validStylesToLoad = Array.from(stylesToLoad).filter(key => key && !key.endsWith("_none") && STYLE_ASSET_MAPPING[key]);
        
        if (validStylesToLoad.length === 0) {
            console.log("DynamicAtlasLoader: No hay nuevos estilos válidos para cargar o todos ya están (potencialmente) en caché.");
            let allCachedAreValid = true;
            for (const styleKey of validStylesToLoad) { 
                const sheet = loadedSpritesheets[styleKey];
                if (!sheet) { 
                    allCachedAreValid = false; break;
                }
            }
            if (allCachedAreValid) setAllPlayerSpritesheetsReady(true);
            else setAllPlayerSpritesheetsReady(false); 
            return;
        }
        
        console.log("DynamicAtlasLoader: Estilos a asegurar/cargar:", validStylesToLoad);
        setAllPlayerSpritesheetsReady(false); 

        const promises = validStylesToLoad.map(styleKey => {
            if (loadedSpritesheets[styleKey]) { 
                const cachedSheet = loadedSpritesheets[styleKey];
                let isValid = true;
                if (cachedSheet.animations) {
                    for (const animKey in cachedSheet.animations) {
                        if (cachedSheet.animations[animKey].some(t => !t.baseTexture?.valid)) isValid = false;
                    }
                }
                if (isValid) return Promise.resolve(cachedSheet);
                delete loadedSpritesheets[styleKey]; 
            }
            return loadStyleAtlas(styleKey); 
        });

        Promise.all(promises).then(results => {
            const allSucceeded = results.every(sheet => sheet !== null);
            if (allSucceeded) {
                console.log("DynamicAtlasLoader: TODOS los estilos necesarios cargados y validados.");
                setAllPlayerSpritesheetsReady(true);
            } else {
                console.error("DynamicAtlasLoader: FALLO al cargar algunos estilos necesarios.");
                setAllPlayerSpritesheetsReady(false);
            }
        }).catch(error => {
            console.error("DynamicAtlasLoader: Error en Promise.all", error);
            setAllPlayerSpritesheetsReady(false);
        });

    }, [isAuthenticated, assetsLoaded, user, serverConfirmedPlayerPos, otherPlayers]); 

    useEffect(() => {
        if (!pixiAppInitialized || !pixiAppRef.current || !mapGridData || !groundRef.current || !obstaclesContainerRef.current) {
            return;
        }
        console.log("GamePage (StaticDraw Effect): Dibujando suelo y obstáculos.");
        const app = pixiAppRef.current; 
        groundRef.current.clear().beginFill(0x334155).drawRect(0,0, mapGridData.worldWidth, mapGridData.worldHeight).endFill();
        
        obstaclesContainerRef.current.removeChildren();
        for (let r = 0; r < mapGridData.gridRows; r++) {
            for (let c = 0; c < mapGridData.gridCols; c++) {
                if (mapGridData.matrix[r][c] === 1) { 
                    const obstacle = new Graphics().beginFill(0x475569).drawRect(c * mapGridData.cellSize, r * mapGridData.cellSize, mapGridData.cellSize, mapGridData.cellSize).endFill();
                    obstaclesContainerRef.current.addChild(obstacle);
                }
            }
        }
         
    }, [pixiAppInitialized, mapGridData, currentRoomDetails]); 

 useEffect(() => {
    console.log(
        "GamePage (PlayersRender Effect): Evaluando. pixiAppInitialized:", pixiAppInitialized,
        "pixiAppRef.current:", !!pixiAppRef.current, "allPlayerSpritesheetsReady:", allPlayerSpritesheetsReady,
        "serverConfirmedPlayerPos:", !!serverConfirmedPlayerPos, "otherPlayers count:", Object.keys(otherPlayers).length
    );

    if (!pixiAppInitialized || !pixiAppRef.current || !pixiAppRef.current.stage || !allPlayerSpritesheetsReady) {
        console.log("PlayersRender Effect: Saltando, condiciones no cumplidas (Pixi no listo o no todos los spritesheets de jugadores están listos).", {
            pixiAppInitialized,
            allPlayerSpritesheetsReady,
            appExists: !!pixiAppRef.current,
            stageExists: !!pixiAppRef.current?.stage
        });
        return;
    }
    const app = pixiAppRef.current; 
    console.log("GamePage (PlayersRender Effect): Procediendo a sincronizar sprites de jugadores.");

    if (serverConfirmedPlayerPos) {
        const updatedMainPlayerState = setupPlayerSprite(app, serverConfirmedPlayerPos, mainPlayerDataRef.current || undefined);
        if (updatedMainPlayerState) {
            mainPlayerDataRef.current = updatedMainPlayerState;
            if (mainPlayerDataRef.current.container && !mainPlayerDataRef.current.container.parent && app.stage) {
                app.stage.addChild(mainPlayerDataRef.current.container);
                console.log(`PlayersRender: Main player ${mainPlayerDataRef.current.username} container añadido al stage.`);
            }
            console.log(`PlayersRender: Main player ${mainPlayerDataRef.current.username} actualizado. Facing: ${mainPlayerDataRef.current.facingDirection}, Anim: ${mainPlayerDataRef.current.currentAnimationName}, Sprites: Body=${!!mainPlayerDataRef.current.bodySprite}`);
        } else {
            console.error("PlayersRender Effect: setupPlayerSprite devolvió null para el jugador principal. Limpiando su ref.");
            if (mainPlayerDataRef.current?.container && !mainPlayerDataRef.current.container.destroyed) {
                mainPlayerDataRef.current.container.destroy({ children: true });
            }
            mainPlayerDataRef.current = null;
        }
    } else if (mainPlayerDataRef.current?.container && !mainPlayerDataRef.current.container.destroyed) {
        console.log("PlayersRender Effect: No hay serverConfirmedPlayerPos. Limpiando sprite del jugador principal del stage y ref.");
        mainPlayerDataRef.current.container.destroy({ children: true });
        mainPlayerDataRef.current = null;
    }

    const newOtherPlayersForRef: Record<string, PlayerState> = {};
    const containersActualmenteEnStageParaOtrosJugadores = new Set<Container>();

     const updatedOtherPlayersState: Record<string, PlayerState> = {};
            Object.values(otherPlayersRef.current).forEach((playerDataFromServerOrState) => {
               
                const pData: PlayerDataFromServer = { 
                    characterId: playerDataFromServerOrState.characterId,
                    username: playerDataFromServerOrState.username,
                    x: playerDataFromServerOrState.x,
                    y: playerDataFromServerOrState.y,
                    bodyStyle: playerDataFromServerOrState.bodyStyle,
                    hairStyle: playerDataFromServerOrState.hairStyle,
                    shirtStyle: playerDataFromServerOrState.shirtStyle,
                    pantsStyle: playerDataFromServerOrState.pantsStyle,
                };

                if (pData.characterId === serverConfirmedPlayerPos?.characterId) return;
                
                const existingPlayerState = otherPlayersRef.current[pData.characterId]; 
                
                const newSpriteState = setupPlayerSprite(app!, pData, existingPlayerState);

                if (newSpriteState) {
                    updatedOtherPlayersState[pData.characterId] = newSpriteState;
                } else if (existingPlayerState) { 
                    updatedOtherPlayersState[pData.characterId] = existingPlayerState;
                } else {
                    console.warn(`PixiJS useEffect: No se pudo configurar el sprite para ${pData.username} y no había estado previo.`);
                }
            });
            setOtherPlayers(updatedOtherPlayersState);
        
}, [isAuthenticated,
    roomId,
    mapGridData,
    pixiAppInitialized, 
    allPlayerSpritesheetsReady, 
    serverConfirmedPlayerPos, 
    setOtherPlayers, 
    setupPlayerSprite, 
]);

    useEffect(() => {
        if (!pixiAppInitialized || !pixiAppRef.current || !roomItemsContainerRef.current || roomItemsContainerRef.current.destroyed) {
            return;
        }
        const app = pixiAppRef.current;
        const container = roomItemsContainerRef.current;
        console.log("GamePage (RoomItemsRender Effect): Actualizando objetos en sala. Count:", Object.keys(roomPlacedItems).length);

        const currentRenderedItemIds = new Set(container.children.map(child => child.name).filter(Boolean));
        const itemIdsInState = new Set(Object.keys(roomPlacedItems));

        currentRenderedItemIds.forEach(renderedId => {
            if (!itemIdsInState.has(renderedId)) {
                const spriteToDestroy = container.getChildByName(renderedId);
                if (spriteToDestroy) {
                    console.log("GamePage (RoomItemsRender): Destruyendo sprite de item ID:", renderedId);
                    spriteToDestroy.destroy({ children: true });
                }
            }
        });

        for (const itemId in roomPlacedItems) {
            const itemData = roomPlacedItems[itemId];
            let itemSprite = container.getChildByName(itemId) as Sprite | null;
            const texture = itemTexturesCacheRef.current[itemData.catalogItem.assetKey];

            if (!texture) { // Si la textura no está en caché, intentar cargarla
                if (!itemTexturesCacheRef.current.hasOwnProperty(itemData.catalogItem.assetKey) || itemTexturesCacheRef.current[itemData.catalogItem.assetKey] === Texture.WHITE) { // No intentar recargar si ya falló y es placeholder
                    const assetUrl = `/assets/items_catalog/${itemData.catalogItem.assetKey}.png`;
                    console.log(`GamePage (RoomItemsRender): Textura no encontrada para ${itemData.catalogItem.assetKey}, cargando...`);
                    Assets.load(assetUrl).then((loadedTexture: Texture) => {
                        itemTexturesCacheRef.current[itemData.catalogItem.assetKey] = loadedTexture;
                        setRoomPlacedItems(prev => ({ ...prev, [itemId]: { ...prev[itemId] } })); // Forzar re-render para usar la textura
                    }).catch(err => {
                        console.error(`Error cargando asset ${assetUrl}:`, err);
                        itemTexturesCacheRef.current[itemData.catalogItem.assetKey] = Texture.WHITE; // Usar placeholder y re-render
                        setRoomPlacedItems(prev => ({ ...prev, [itemId]: { ...prev[itemId] } }));
                    });
                }
                if (itemSprite) itemSprite.visible = false; // Ocultar mientras carga textura
                continue; // Pasar al siguiente item, se renderizará cuando la textura esté
            }

            if (!itemSprite || itemSprite.destroyed) {
                itemSprite = new Sprite(texture);
                itemSprite.name = itemId;
                itemSprite.anchor.set(0.5); 
                if (itemData.catalogItem.dimensionsGrid && mapGridData && mapGridData.cellSize > 0 && itemSprite instanceof Sprite) {
                    itemSprite.width = itemData.catalogItem.dimensionsGrid.width * mapGridData.cellSize;
                    itemSprite.height = itemData.catalogItem.dimensionsGrid.height * mapGridData.cellSize;
                } else if (texture !== Texture.WHITE && itemSprite instanceof Sprite) { 
                     
                }
                container.addChild(itemSprite);
                console.log(`GamePage (RoomItemsRender): Sprite para item ${itemId} creado/añadido.`);
            }
            
            if (itemSprite) { 
                itemSprite.position.set(itemData.x, itemData.y);
                itemSprite.rotation = (itemData.rotation || 0) * (Math.PI / 180);
                itemSprite.zIndex = itemData.zIndex || 0;
                itemSprite.visible = true;
                 if (amIHost) { // Solo el host puede interactuar para moverlos
                    itemSprite.eventMode = 'static';
                    itemSprite.cursor = 'grab';
                    itemSprite.off('pointerdown', handleStageClick); //
                    itemSprite.on('pointerdown', handleStageClick); //
                } else {
                    itemSprite.eventMode = 'none';
                    itemSprite.cursor = 'default';
                }
            }
        }
        container.sortChildren(); 
    }, [pixiAppInitialized, roomPlacedItems, mapGridData, amIHost, handleStageClick]); 

    useEffect(() => {
        if (!pixiAppInitialized || !pixiAppRef.current || !pixiAppRef.current.stage) return;
        const app = pixiAppRef.current;

        if (isPlacementModeActive && selectedItemTexture && selectedItemForPlacement) {
            if (!placementPreviewSpriteRef.current || placementPreviewSpriteRef.current.destroyed) {
                placementPreviewSpriteRef.current = new Sprite(selectedItemTexture);
                placementPreviewSpriteRef.current.alpha = 0.7;
                placementPreviewSpriteRef.current.anchor.set(0.5);
                app.stage.addChild(placementPreviewSpriteRef.current);
            } else {
                if (placementPreviewSpriteRef.current.texture !== selectedItemTexture) {
                    placementPreviewSpriteRef.current.texture = selectedItemTexture;
                }
            }
            placementPreviewSpriteRef.current.visible = true;
        } else {
            if (placementPreviewSpriteRef.current && !placementPreviewSpriteRef.current.destroyed) {
                placementPreviewSpriteRef.current.destroy();
                placementPreviewSpriteRef.current = null;
            }
        }
        return () => { 
            if (placementPreviewSpriteRef.current && !placementPreviewSpriteRef.current.destroyed) {
                placementPreviewSpriteRef.current.destroy();
                placementPreviewSpriteRef.current = null;
            }
        };
    }, [pixiAppInitialized, isPlacementModeActive, selectedItemTexture, selectedItemForPlacement]);

    useEffect(() => {
        const app = pixiAppRef.current;
        if (!app || !app.stage || !pixiAppInitialized) return;

        app.stage.on('pointermove', handlePointerMove);
        app.stage.on('pointerdown', handleStageClick);
        app.stage.on('pointerup', handlePointerMove);
        app.stage.on('pointerupoutside', handlePointerMove);

        return () => {
            if (app?.stage && !app.stage.destroyed) {
                app.stage.off('pointermove', handlePointerMove);
                app.stage.off('pointerdown', handleStageClick);
                app.stage.off('pointerup', handlePointerMove);
                app.stage.off('pointerupoutside', handlePointerMove);
            }
        };
    }, [pixiAppInitialized, handlePointerMove, handleStageClick]);

    useEffect(() => {
        if (!isPlacementModeActive) return;
        const handleCancelPlacementKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                console.log("GamePage: Modo de colocación cancelado (Escape).");
                setIsPlacementModeActive(false);
                setSelectedItemForPlacement(null);
                setSelectedItemTexture(null); 
            }
        };
        window.addEventListener('keydown', handleCancelPlacementKey);
        return () => {
            window.removeEventListener('keydown', handleCancelPlacementKey);
        };
    }, [isPlacementModeActive]);


    useEffect(() => {

    if (!isAuthenticated || !user || !socketService.socket || !roomId) { 
        return;
    }

    console.log("GamePage: Setting up game-specific socket listeners AND emitting player_ready_in_room.");

    
    if (!socketService.socket.connected) {
        console.warn("GamePage: Effect 4 - Socket no conectado aún. No se emitirá player_ready_in_room ni se registrarán listeners todavía.");
        
        return;
    }

    
    socketService.socket.off('my_player_move_path', handleMyPlayerMovePath);
    socketService.socket.off('new_player_joined', handleNewPlayerJoined);
    socketService.socket.off('other_player_moved', handleOtherPlayerMoved);
    socketService.socket.off('player_left_room_notification', handlePlayerLeft); 
    socketService.socket.off('new_chat_message', handleNewChatMessage);
    socketService.socket.off('player_appearance_changed', handlePlayerAppearanceChanged);
    
    socketService.socket.on('my_player_move_path', handleMyPlayerMovePath);
    socketService.socket.on('new_player_joined', handleNewPlayerJoined);
    socketService.socket.on('other_player_moved', handleOtherPlayerMoved);
    socketService.socket.on('player_left_room_notification', handlePlayerLeft); 
    socketService.socket.on('new_chat_message', handleNewChatMessage);
    socketService.socket.on('player_appearance_changed', handlePlayerAppearanceChanged);
    
    console.log(`GamePage: Emitiendo 'player_ready_in_room' para roomId: ${roomId}`);
 if (!initialPlayerDataSet && socketService.socket.connected) {
        console.log(`GamePage: Emitiendo 'player_ready_in_room' para roomId: ${roomId}`);
        socketService.emit('player_ready_in_room', { roomId });
    }

    return () => {
        console.log("GamePage: Cleaning up game-specific socket listeners from Effect 4.");
        if (socketService.socket) {
            socketService.socket.off('my_player_move_path', handleMyPlayerMovePath);
            socketService.socket.off('new_player_joined', handleNewPlayerJoined);
            socketService.socket.off('other_player_moved', handleOtherPlayerMoved);
            socketService.socket.off('player_left_room_notification', handlePlayerLeft); 
            socketService.socket.off('new_chat_message', handleNewChatMessage);
            socketService.socket.off('player_appearance_changed', handlePlayerAppearanceChanged);
        }
    };
  
}, [isAuthenticated, user, roomId, initialPlayerDataSet, handleMyPlayerMovePath, handleNewPlayerJoined, handleOtherPlayerMoved, handlePlayerLeft, handleNewChatMessage, handlePlayerAppearanceChanged]);                              
    useEffect(() => {
        if (welcomeTextRef.current) {
            if (user && serverConfirmedPlayerPos) {
                //welcomeTextRef.current.text = `¡Bienvenido, ${user.username}!`;
            } else if (user && !serverConfirmedPlayerPos && assetsLoaded) {
                welcomeTextRef.current.text = `Esperando datos del servidor para ${user.username}...`;
            } else if (assetsLoaded) {
                 welcomeTextRef.current.text = `Cargando...`;
            } else {
                 welcomeTextRef.current.text = `Cargando assets...`;
            }
        }
    }, [user, serverConfirmedPlayerPos, assetsLoaded]);

    useEffect(() => {
        const mainPlayer = mainPlayerDataRef.current;
        if (mainPlayer?.container && serverConfirmedPlayerPos) {
            if (!mainPlayerCurrentPathForLoopRef.current || mainPlayerCurrentPathForLoopRef.current.length === 0) {
                mainPlayer.container.x = serverConfirmedPlayerPos.x;
                mainPlayer.container.y = serverConfirmedPlayerPos.y;
            }
            mainPlayer.container.visible = true;
        } else if (mainPlayer?.container) {
            mainPlayer.container.visible = false;
        }
    }, [serverConfirmedPlayerPos, mainPlayerCurrentPathForLoopRef.current]);

    
  useEffect(() => {
        if (!isPlacementModeActive) return;

        const handleCancelPlacement = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                console.log("GamePage: Modo de colocación cancelado (Escape).");
                setIsPlacementModeActive(false);
                setSelectedItemForPlacement(null);
            }
        };
        window.addEventListener('keydown', handleCancelPlacement);
        return () => {
            window.removeEventListener('keydown', handleCancelPlacement);
        };
    }, [isPlacementModeActive]);

    useEffect(() => {
        if (roomId && !currentRoomDetails) { 
           
            const gameData = serverConfirmedPlayerPos; 
            if (gameData && currentUser) {
                 console.warn("GamePage: TODO - Necesitas una forma de obtener y verificar el hostUserId de la sala actual.");
                 
            }
        }
    }, [roomId, currentUser, serverConfirmedPlayerPos]);

  useEffect(() => {
        if (isPlacementModeActive && selectedItemForPlacement && pixiAppRef.current) {
            const assetUrl = `/assets/items_catalog/${selectedItemForPlacement.catalogItem.assetKey}.png`;
            console.log("GamePage: Cargando asset para vista previa de colocación:", assetUrl);
            Assets.load(assetUrl)
                .then((texture: Texture) => {
                    console.log("GamePage: Textura cargada para vista previa:", texture);
                    setSelectedItemTexture(texture);
                })
                .catch(err => {
                    console.error("GamePage: Error al cargar textura para vista previa:", assetUrl, err);
                    setSelectedItemTexture(null); 
                   
                });
        } else {
            setSelectedItemTexture(null); 
        }
    }, [isPlacementModeActive, selectedItemForPlacement]);

    useEffect(() => {
        const app = pixiAppRef.current;
        if (!app || !app.stage) return;

        if (isPlacementModeActive && selectedItemTexture && selectedItemForPlacement) {
            if (!placementPreviewSpriteRef.current || placementPreviewSpriteRef.current.destroyed) {
                placementPreviewSpriteRef.current = new Sprite(selectedItemTexture);
                placementPreviewSpriteRef.current.alpha = 0.7; 
                placementPreviewSpriteRef.current.anchor.set(0.5); 
                
                app.stage.addChild(placementPreviewSpriteRef.current);
                console.log("GamePage: Sprite de vista previa creado y añadido a la escena.");
            } else {
                if (placementPreviewSpriteRef.current.texture !== selectedItemTexture) {
                    placementPreviewSpriteRef.current.texture = selectedItemTexture;
                }
            }
            placementPreviewSpriteRef.current.visible = true;
        } else {
            // Si no estamos en modo colocación o no hay textura, ocultar/destruir el sprite
            if (placementPreviewSpriteRef.current && !placementPreviewSpriteRef.current.destroyed) {
                console.log("GamePage: Destruyendo sprite de vista previa.");
                placementPreviewSpriteRef.current.destroy(); 
                placementPreviewSpriteRef.current = null;
            }
        }
        return () => {
            if (placementPreviewSpriteRef.current && !placementPreviewSpriteRef.current.destroyed) {
                console.log("GamePage: Limpiando sprite de vista previa en cleanup de useEffect.");
                placementPreviewSpriteRef.current.destroy();
                placementPreviewSpriteRef.current = null;
            }
        };
    }, [isPlacementModeActive, selectedItemTexture, selectedItemForPlacement]); 

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (pixiAppRef.current && pixiContainerRef.current) {
                if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
                } else {
                }
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange); 
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const handleSendChatMessage = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const messageText = chatInput.trim();
        if (messageText && socketService.socket?.connected) {
            socketService.emit('send_chat_message', { messageText });
            setChatInput('');
        } else if (!socketService.socket?.connected) {
            setServerMessages(prev => [...prev.slice(-4), "Error: No conectado al chat."]);
        }
    };
    if (authIsLoading) {
        return <div className="fixed inset-0 bg-slate-900 flex justify-center items-center text-white text-xl z-[200]"><p>Verificando autenticación...</p></div>;
    }
    if (!isAuthenticated) {
        return <div className="fixed inset-0 bg-slate-900 flex justify-center items-center text-white text-xl z-[200]"><p>Necesitas iniciar sesión para continuar.</p></div>;
    }
    if (!roomId) {
        return (
            <>
                <HotelView
                    username={user?.username}
                    onOpenCatalog={() => setIsCatalogOpen(true)}
                    onOpenInventory={() => setIsInventoryOpen(true)}
                    onOpenRoomNavigator={() => setIsRoomNavigatorOpen(true)}
                    onOpenFriends={() => setIsFriendsOpen(true)}
                />
                {/* Paneles Overlay que se pueden abrir desde HotelView */}
                {isRoomNavigatorOpen && <RoomNavigator isOpen={isRoomNavigatorOpen} onClose={() => setIsRoomNavigatorOpen(false)} />}
                {isCatalogOpen && <CatalogPanel isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />}
                {isInventoryOpen && 
                    <InventoryPanel 
                        isOpen={isInventoryOpen} 
                        onClose={() => setIsInventoryOpen(false)} 
                        onSelectItemForPlacement={(item) => {
                            console.log("Seleccionado desde inventario en HotelView:", item.catalogItem.name);
                            alert("Por favor, primero entra o crea una sala para colocar objetos.");
                            setIsInventoryOpen(false);
                        }} 
                    />
                }
                {isFriendsOpen && <FriendsPanel isOpen={isFriendsOpen} onClose={() => setIsFriendsOpen(false)} onOpenChat={handleOpenChat} />}
            </>
        );
    }
    return (
        <>
            {!initialPlayerDataSet && <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex justify-center items-center text-white text-xl z-[150]"><p>Conectando a la sala ({roomId})...</p></div>}
            {initialPlayerDataSet && !assetsLoaded && <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex justify-center items-center text-white text-xl z-[150]"><p>Cargando assets del personaje...</p></div>}
            {initialPlayerDataSet && assetsLoaded && !pixiAppInitialized && <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex justify-center items-center text-white text-xl z-[150]"><p>Inicializando mundo...</p></div>}
            
            <div 
                className={`game-canvas-and-ui-wrapper w-screen h-screen block relative ${(!pixiAppInitialized || !initialPlayerDataSet) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
                style={{ margin: 0, padding: 0, overflow: 'hidden', transition: 'opacity 0.3s ease-in-out' }}
            >
                <div ref={pixiContainerRef} className="pixi-canvas-container w-full h-full" /> 
                {pixiAppInitialized && ( 
                    <>
                        <div className="absolute top-6 right-6 flex flex-col space-y-3 z-50">
                            {[
                                { label: 'Salir a Hotel', onClick: () => navigate('/game'), color: 'bg-red-500', emoji: '🏨' },
                                { label: 'Salas', onClick: () => setIsRoomNavigatorOpen(true), color: 'bg-sky-500', emoji: '🚪' },
                                { label: 'Tienda', onClick: () => setIsCatalogOpen(true), color: 'bg-teal-500', emoji: '🛍️' },
                                { label: 'Inventario', onClick: () => setIsInventoryOpen(true), color: 'bg-lime-500', emoji: '🎒' },
                                { label: 'Ropero', onClick: () => setIsWardrobeOpen(true), color: 'bg-purple-500', emoji: '🧥' },
                                { label: 'Mis Amigos', onClick: () => setIsFriendsPanelOpen(true), color: 'bg-pink-500', emoji: '👥' },
                            ].map(({ label, onClick, color, emoji }, i) => (
                                <button
                                key={i}
                                onClick={onClick}
                                className={`
                                    ${color} text-white font-semibold py-3 px-5 rounded-xl shadow-md 
                                    hover:brightness-110 hover:scale-105 transition-all duration-150 
                                    flex items-center space-x-2 text-sm sm:text-base
                                    backdrop-blur-md bg-opacity-80 border border-white/10
                                `}
                                >
                                <span className="text-lg">{emoji}</span>
                                <span>{label}</span>
                                </button>
                            ))}
                            </div>

                        {isPlacementModeActive && selectedItemForPlacement && (
                            <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white p-3 rounded-md shadow-lg z-[60] text-sm">
                                Colocando: {selectedItemForPlacement.catalogItem.name} (ESC para cancelar)
                            </div>
                        )}
                        
                      <div
                    className="absolute bottom-24 left-4 w-[28rem] max-w-lg bg-gradient-to-br from-gray-900 to-gray-800 bg-opacity-90 backdrop-blur-md rounded-xl shadow-lg p-4 text-sm text-lime-200 z-30 overflow-y-auto h-40 border border-gray-700"
                    aria-live="polite"
                    >
                    <h3 className="text-lime-400 font-bold text-xs uppercase tracking-wide mb-2 border-b border-lime-700 pb-1">
                        Log / Chat
                    </h3>

                    <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar pr-1">
                        {chatMessages.map((msg, index) => (
                        <div key={`chat-${msg.timestamp}-${index}-${msg.characterId}`}>
                            <span
                            className="font-semibold"
                            style={{
                                color:
                                msg.characterId === serverConfirmedPlayerPos?.characterId
                                    ? '#38bdf8' // sky-400
                                    : OTHER_PLAYER_COLOR,
                            }}
                            >
                            {msg.username}:
                            </span>{' '}
                            <span className="text-gray-200">{msg.messageText}</span>
                        </div>
                        ))}

                        {serverMessages.map((msg, index) => (
                        <div key={`server-msg-${index}`} className="text-yellow-400 font-medium">
                            {msg}
                        </div>
                        ))}
                    </div>
                    </div>
                <form
                    onSubmit={handleSendChatMessage}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 w-11/12 md:w-1/2 lg:w-1/3 max-w-xl flex gap-2 p-3 bg-gray-900 bg-opacity-90 backdrop-blur-md rounded-xl shadow-xl z-40 border border-gray-700"
                    >
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-grow bg-gray-800 text-white border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400"
                        maxLength={100}
                    />
                    <button
                        type="submit"
                        className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-4 py-2 rounded-md text-sm transition duration-150 shadow-md"
                    >
                        Enviar
                        </button>
                        </form>
                        {serverConfirmedPlayerPos && user && (
                           <div className="absolute top-4 left-4 z-30">
                            <div className="bg-gradient-to-br from-gray-800 to-gray-900 bg-opacity-50 border border-gray-700 rounded-xl p-4 shadow-lg text-white w-60 backdrop-blur-md">
                                <div className="space-y-1 text-sm">
                                <p><span className="text-gray-400">👤 Usuario:</span> {user.username}</p>
                                <p><span className="text-gray-400">💰 Dinero:</span> {user.currencyBalance || 0}</p>
                                <p><span className="text-gray-400">🏠 Sala:</span> {currentRoomDetails?.name || roomId}</p>
                                </div>
                            </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {isRoomNavigatorOpen && <RoomNavigator isOpen={isRoomNavigatorOpen} onClose={() => setIsRoomNavigatorOpen(false)} />}
            {isCatalogOpen && <CatalogPanel isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />}
            {isInventoryOpen && 
                <InventoryPanel 
                    isOpen={isInventoryOpen} 
                    onClose={() => setIsInventoryOpen(false)} 
                    onSelectItemForPlacement={handleSelectItem} 
                />
            }
            {isWardrobeOpen && serverConfirmedPlayerPos && 
                <WardrobePanel
                    isOpen={isWardrobeOpen}
                    onClose={() => setIsWardrobeOpen(false)}
                    onApply={handleApplyWardrobeChanges}
                     currentStyles={{ 
                    bodyStyle: serverConfirmedPlayerPos.bodyStyle,
                    hairStyle: serverConfirmedPlayerPos.hairStyle,
                    shirtStyle: serverConfirmedPlayerPos.shirtStyle,
                    pantsStyle: serverConfirmedPlayerPos.pantsStyle,
                }}
                availableStyles={AVAILABLE_STYLES}
                />
            }
                 {isFriendsPanelOpen && (
                <FriendsPanel 
                    isOpen={isFriendsPanelOpen} 
                    onClose={() => setIsFriendsPanelOpen(false)}
                    onOpenChat={handleOpenChat} 
                />
                )}
                {chattingWithFriend && (
                <PrivateChatWindow 
                    isOpen={!!chattingWithFriend} 
                onClose={handleCloseChat} 
                    friend={chattingWithFriend} 
                />
                )}
        </>
    );
};

export default GamePage;