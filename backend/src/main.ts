/**
 * @file main.ts
 * @description
 * Punto de entrada principal para el backend de Lotem.
 * Configura y arranca el servidor Express y Socket.IO, inicializa la base de datos con TypeORM,
 * y define endpoints HTTP y eventos de WebSocket para funcionalidades de:
 * - Autenticación y autorización JWT
 * - Gestión de salas multijugador y personajes
 * - Chat público y privado (texto e imágenes)
 * - Feed de publicaciones (tipo red social)
 * - Sistema de amigos y solicitudes de amistad
 * - Tienda, catálogo, inventario y decoración de salas
 * - Chat de voz (señalización WebRTC)
 * Incluye middlewares de seguridad, manejo de archivos (Multer), y lógica de negocio modularizada en servicios.
 */
import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import AppDataSource from './config/data-source';
import { Repository } from 'typeorm';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs'; 
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { configureJwtStrategy } from './modules/auth/jwt.strategy';
import { User, UserRole } from './modules/auth/entities/User.entity';
import { PlayerCharacter } from './modules/character/entities/PlayerCharacter.entity';
import { RoomService } from './modules/room/room.service'; 
import { Room } from './modules/room/entities/Room.entity';   
import { findPath, gridToWorldCoords, worldToGridCoords, getGameGridMatrix, CELL_SIZE, GRID_COLS, GRID_ROWS, WORLD_WIDTH, WORLD_HEIGHT } from './core/pathfinding/grid.service'; 
import { CurrencyService } from './modules/currency/currency.service';
import { CatalogService } from './modules/catalog/catalog.service';
import { InventoryService } from './modules/inventory/inventory.service';
import { PurchaseService } from './modules/shop/purchase.service';
import { RoomDecorationService } from './modules/room/room-decoration.service';
import { Friendship } from './modules/friends/entities/Friendship.entity';
import { FriendshipService } from './modules/friends/friendship.service';
import { PrivateChatService } from './modules/chat/private-chat.service';
import { AchievementService } from './modules/achiviements/achievement.service';
import { PostStatus, PostType } from './modules/posts/entities/Post.entity';
import { PostService } from './modules/posts/post.service';
import { ensureRole } from './middlewares/role.middleware';
import { LikeService } from './modules/likes/like.service';
import { CommentService } from './modules/comments/comment.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const app = express();
const port = process.env.PORT || 3001;
app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(passport.initialize());
configureJwtStrategy(passport);
app.get('/', (req: Request, res: Response) => {
    res.send('¡El backend de Lotem funciona correctamente!');
});
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});
const CHAT_IMAGES_FOLDER = 'chat_images'; // Subcarpeta dentro de public/uploads
const UPLOAD_DESTINATION_BASE = path.join(process.cwd(), 'public', 'uploads');
const CHAT_IMAGES_PATH = path.join(UPLOAD_DESTINATION_BASE, CHAT_IMAGES_FOLDER);
if (!fs.existsSync(UPLOAD_DESTINATION_BASE)) {
    fs.mkdirSync(UPLOAD_DESTINATION_BASE, { recursive: true });
}
if (!fs.existsSync(CHAT_IMAGES_PATH)) {
    fs.mkdirSync(CHAT_IMAGES_PATH, { recursive: true });
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, CHAT_IMAGES_PATH); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
cb(null, `chatimg-${uniqueSuffix}${extension}`);
    }
});

const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(null, false); 
    }
};

const uploadChatImage = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

const publicFolderPath = path.resolve(__dirname, '../../public');
app.use('/public', express.static(path.join(process.cwd(), 'public')));
console.log(`Sirviendo archivos estáticos desde: ${publicFolderPath} en la ruta /public`);
interface ActivePlayerInfo {
    socketId: string;
    userId: string;
    username: string;
    characterId: string;
    x: number; 
    y: number; 
    bodyStyle: string;
    hairStyle: string;
    shirtStyle: string;
    pantsStyle: string;
    currentRoomId?: string | null; 
    inCallWithUserId?: string | null; 

}
async function bootstrap() {
    await AppDataSource.initialize(); 
    console.log("DataSource Inicializado. OK?:", AppDataSource.isInitialized); 

const activePlayers: { [socketId: string]: ActivePlayerInfo } = {};
const roomService = new RoomService(); 
const currencyService = new CurrencyService(); 
const catalogService = new CatalogService();   
const inventoryService = new InventoryService(); 
const purchaseService = new PurchaseService(); 
const roomDecorationService = new RoomDecorationService(); 
const friendshipService = new FriendshipService();
const privateChatService = new PrivateChatService();
const postService = new PostService(); 
const likeService = new LikeService(); 
const commentService = new CommentService(); 
app.post(
    '/api/chat/upload-image',
    uploadChatImage.single('chatImage'),             
    (req: Request, res: Response, next: NextFunction) => { 
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No se subió ningún archivo o no es una imagen válida.' });
            return; 
        }
        const imageUrl = `/public/uploads/${CHAT_IMAGES_FOLDER}/${req.file.filename}`;
        console.log(`Imagen subida por ${(req.user as User)?.username}: ${req.file.filename}, accesible en: ${imageUrl}`);
        
        res.json({
            success: true,
            message: 'Imagen subida correctamente.',
            imageUrl: imageUrl,
           
        });
       
    },
   
    (error: Error, req: Request, res: Response, next: NextFunction) => {
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                res.status(400).json({ success: false, message: 'La imagen es demasiado grande (máx 5MB).' });
                return;
            }
            res.status(400).json({ success: false, message: `Error de subida Multer: ${error.message}` });
            return;
        } else if (error) { // Otros errores (ej. del filtro de archivo si cb(new Error(...)) se usó)
            res.status(400).json({ success: false, message: error.message || "Error en la subida." });
            return;
        }
      
        next(error); 
    }
);
/**
 * Endpoints para gestión de publicaciones (posts) en el feed y CMS.
 * - /api/feed/posts: Crear "tweets" (posts rápidos) de jugadores autenticados.
 * - /api/cms/posts: CRUD completo para posts desde el CMS (requiere autenticación).
 */

app.post(
    '/api/feed/posts',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User;
        if (!user || !user.id) {
            res.status(401).json({ message: "No autenticado para crear un post." });
            return;
        }
        const { contentText, imageUrl } = req.body;
        if (!contentText || typeof contentText !== 'string' || !contentText.trim()) {
            if (!imageUrl) {
                res.status(400).json({ message: "El contenido del post no puede estar vacío si no se adjunta una imagen." });
                return;
            }
        }
        if (contentText && contentText.length > 280) {
            res.status(400).json({ message: "El post es demasiado largo (máximo 280 caracteres)." });
            return;
        }
        const postDataToSend = {
            title: null,
            contentText: contentText ? contentText.trim() : null,
            imageUrl: imageUrl || null,
            type: PostType.TWEET,
            status: PostStatus.PUBLISHED,
        };
        try {
            const createdPostEntity = await postService.createPost(postDataToSend, user.id);
            if ('error' in createdPostEntity) {
                res.status(400).json(createdPostEntity);
                return;
            }
            const postWithAuthor = await AppDataSource.getRepository(User).findOneBy({ id: createdPostEntity.authorId });
            const clientPostPayload = {
                id: createdPostEntity.id,
                title: createdPostEntity.title || 'Tweet de ' + (postWithAuthor?.username || user.username),
                contentText: createdPostEntity.contentText,
                imageUrl: createdPostEntity.imageUrl,
                type: createdPostEntity.type,
                authorUsername: postWithAuthor?.username || user.username,
                publishedAt: createdPostEntity.publishedAt
                    ? createdPostEntity.publishedAt.toISOString()
                    : new Date().toISOString(),
                likeCount: createdPostEntity.likeCount,
                commentCount: createdPostEntity.commentCount,
                likedByCurrentUser: false,
            };
            io.emit('feed:new_post', clientPostPayload);
            res.status(201).json(clientPostPayload);
        } catch (e: any) {
            next(e);
        }
    }
);

app.post('/api/cms/posts',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User;
        if (!user) {
            res.status(401).json({ message: "Token inválido o usuario no encontrado." });
            return;
        }
        const createPostDto = req.body;
        try {
            const result = await postService.createPost(createPostDto, user.id);
            if ('error' in result) {
                res.status(400).json(result);
                return;
            }
            if (result.status === PostStatus.PUBLISHED) {
                const authorForEvent = await AppDataSource.getRepository(User).findOneBy({ id: result.authorId });
                io.emit('feed:new_post', {
                    id: result.id,
                    title: result.title,
                    contentText: result.contentText,
                    imageUrl: result.imageUrl,
                    type: result.type,
                    publishedAt: result.publishedAt,
                    authorUsername: authorForEvent?.username || 'Equipo Lotem',
                    likeCount: result.likeCount,
                    commentCount: result.commentCount,
                });
            }
            res.status(201).json(result);
        } catch (e: any) {
            next(e);
        }
    }
);

app.get('/api/cms/posts',
    async (req: Request, res: Response, next: NextFunction) => {
        const { page, limit, type, status, searchTerm } = req.query;
        try {
            const result = await postService.findAllPostsForCMS({
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                type: type as PostType | undefined,
                status: status as PostStatus | undefined,
                searchTerm: searchTerm as string | undefined
            });
            res.json(result);
        } catch (e: any) {
            next(e);
        }
    }
);

app.get('/api/cms/posts/:id',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const post = await postService.getPublishedPostById(req.params.id);
            if (!post) {
                res.status(404).json({ message: "Post no encontrado." });
                return;
            }
            res.json(post);
        } catch (e: any) {
            next(e);
        }
    }
);

app.put('/api/cms/posts/:id',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User;
        if (!user) {
            res.status(401).json({ message: "Token inválido o usuario no encontrado." });
            return;
        }
        try {
            const result = await postService.updatePost(req.params.id, req.body, user.id);
            if ('error' in result) {
                res.status(400).json(result);
                return;
            }
            const postForEvent = await postService.getPublishedPostById(result.id);
            if (result.status === PostStatus.PUBLISHED) {
                io.emit('feed:post_updated', {
                    id: result.id,
                    title: result.title,
                    contentText: result.contentText,
                    imageUrl: result.imageUrl,
                    type: result.type,
                    publishedAt: result.publishedAt,
                    authorUsername: postForEvent?.author?.username || 'Equipo Lotem',
                    likeCount: result.likeCount,
                    commentCount: result.commentCount,
                });
            } else if (postForEvent?.status !== PostStatus.PUBLISHED) {
                // No emitir evento si no está publicado
            } else {
                io.emit('feed:post_deleted', { postId: result.id });
            }
            res.json(result);
        } catch (e: any) {
            next(e);
        }
    }
);

app.delete('/api/cms/posts/:id',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User;
        if (!user) {
            res.status(401).json({ message: "Token inválido o usuario no encontrado." });
            return;
        }
        try {
            const result = await postService.deletePost(req.params.id, user.id);
            if ('error' in result || !result.success) {
                res.status(400).json(result);
                return;
            }
            io.emit('feed:post_deleted', { postId: req.params.id });
            res.json(result);
        } catch (e: any) {
            next(e);
        }
    }
);

/**
 * Endpoints para feed de publicaciones, likes y comentarios.
 * Incluye autenticación JWT donde es necesario.
 */

// Obtener publicaciones del feed (público)
app.get('/api/feed/posts', async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, type } = req.query;
    try {
        const result = await postService.getPublishedPostsForFeed({
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            type: type as PostType | undefined,
        });
        const clientPosts = result.posts.map(post => ({
            id: post.id,
            title: post.title,
            contentText: post.contentText,
            imageUrl: post.imageUrl,
            type: post.type,
            authorUsername: post.author?.username || 'Equipo Lotem',
            publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
            likeCount: post.likeCount,
            commentCount: post.commentCount,
        }));
        res.json({ posts: clientPosts, total: result.total });
    } catch (e: any) {
        next(e);
    }
});

// Verificar estado de "me gusta" para un array de posts
app.post(
    '/api/posts/liked-status',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User;
        const { postIds } = req.body;
        if (!user?.id) {
            res.status(401).json({ success: false, message: "No autenticado." });
            return;
        }
        if (!Array.isArray(postIds)) {
            res.status(400).json({ success: false, message: "Se esperaba un array de postIds." });
            return;
        }
        if (postIds.length === 0) {
            res.json({ success: true, likedPostIds: [] });
            return;
        }
        try {
            const likedPostIdsArray = await likeService.getLikedPostIdsByUser(user.id, postIds);
            res.json({ success: true, likedPostIds: likedPostIdsArray });
        } catch (e) {
            next(e);
        }
    }
);

// Dar "me gusta" a un post
app.post('/api/posts/:postId/like', passport.authenticate('jwt', { session: false }), async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    const postId = req.params.postId;
    if (!user?.id) { res.status(401).json({ message: "No autenticado." }); return; }
    try {
        const result = await likeService.likePost(user.id, postId);
        if (!result.success) {
            res.status(400).json({ message: result.message, alreadyLiked: result.alreadyLiked });
            return;
        }
        const likedByCurrentUser = await likeService.didUserLikePost(user.id, postId);
        res.json({
            success: true,
            likeCount: result.post?.likeCount,
            commentCount: result.post?.commentCount,
            likedByCurrentUser
        });
    } catch (e) { next(e); }
});

// Quitar "me gusta" a un post
app.delete('/api/posts/:postId/like', passport.authenticate('jwt', { session: false }), async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    const postId = req.params.postId;
    if (!user?.id) { res.status(401).json({ message: "No autenticado." }); return; }
    try {
        const result = await likeService.unlikePost(user.id, postId);
        if (!result.success) {
            res.status(400).json({ message: result.message });
            return;
        }
        const likedByCurrentUser = await likeService.didUserLikePost(user.id, postId);
        res.json({
            success: true,
            likeCount: result.post?.likeCount,
            commentCount: result.post?.commentCount,
            likedByCurrentUser
        });
    } catch (e) { next(e); }
});

// Obtener comentarios de un post
app.get('/api/posts/:postId/comments', passport.authenticate('jwt', { session: false }), async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.postId;
    const { page, limit } = req.query;
    try {
        const result = await commentService.getCommentsForPost(postId, page ? parseInt(page as string) : 1, limit ? parseInt(limit as string) : 10);
        if ('error' in result) {
            res.status(400).json(result);
            return;
        }
        const clientComments = result.comments.map(c => ({
            id: c.id,
            contentText: c.contentText,
            createdAt: c.createdAt.toISOString(),
            userId: c.user.id,
            username: c.user.username,
            parentId: c.parentId,
            childrenCount: c.children?.length || 0
        }));
        res.json({ comments: clientComments, total: result.total });
    } catch (e) { next(e); }
});

// Crear comentario en un post
app.post('/api/posts/:postId/comments', passport.authenticate('jwt', { session: false }), async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    const postId = req.params.postId;
    const { contentText, parentCommentId } = req.body;
    if (!user?.id) { res.status(401).json({ message: "No autenticado." }); return; }
    try {
        const result = await commentService.createComment(user.id, postId, contentText, parentCommentId);
        if ('error' in result || !result.comment) {
            res.status(400).json(result);
            return;
        }
        const clientComment = {
            id: result.comment.id,
            contentText: result.comment.contentText,
            createdAt: result.comment.createdAt.toISOString(),
            userId: result.comment.user.id,
            username: result.comment.user.username,
            parentId: result.comment.parentId
        };
        res.status(201).json({
            success: true,
            comment: clientComment,
            newCommentCount: result.updatedPost?.commentCount
        });
    } catch (e) { next(e); }
});

// Eliminar comentario
app.delete('/api/comments/:commentId', passport.authenticate('jwt', { session: false }), async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    const commentId = req.params.commentId;
    if (!user?.id) { res.status(401).json({ message: "No autenticado." }); return; }
    try {
        const result = await commentService.deleteComment(user.id, commentId);
        if ('error' in result || !result.success) {
            res.status(400).json(result);
            return;
        }
        res.json({
            success: true,
            message: result.message,
            newCommentCount: result.updatedPost?.commentCount
        });
    } catch (e) { next(e); }
});

// Middleware de autenticación para sockets
io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: No token provided.'));
    }
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) return next(new Error('Server configuration error.'));
        const decoded = jwt.verify(token, jwtSecret) as { id: string; username: string };
        const authService = new AuthService();
        const user = await authService.validateUserById(decoded.id);
        if (!user) return next(new Error('Authentication error: Invalid user.'));
        (socket.data as any).user = { id: user.id, username: user.username, email: user.email };
        console.log(`SOCKET AUTH: Usuario ${user.username} (ID: ${user.id}) autenticado para socket ${socket.id}`);
        next();
    } catch (err: any) {
        let msg = 'Authentication error: Invalid token.';
        if (err.name === 'TokenExpiredError') msg = 'Authentication error: Token expired.';
        else if (err.name === 'JsonWebTokenError') msg = 'Authentication error: Malformed token.';
        console.log(`SOCKET AUTH: Conexión rechazada (${msg}) para socket ${socket.id}. Error: ${err.message}`);
        return next(new Error(msg));
    }
});

io.on('connection', (socket: Socket) => {
    const authenticatedUserSocketData = (socket.data as any).user as { id: string; username: string; email: string };

    if (!authenticatedUserSocketData) {
        socket.disconnect(true);
        return;
    }
    console.log(`🔌 Usuario conectado a Socket.IO: ${authenticatedUserSocketData.username} (Socket ID: ${socket.id})`);
    const initializePlayerSession = async () => {
        const userRepository = AppDataSource.getRepository(User);
        const playerCharacterRepository = AppDataSource.getRepository(PlayerCharacter);
        let userEntity = await userRepository.findOne({ where: { id: authenticatedUserSocketData.id }, relations: ['playerCharacter'] });

        if (!userEntity) {
            console.error(`Error inicializando sesión: User no encontrado ${authenticatedUserSocketData.id}`);
            socket.emit('game_error', { message: 'Error de sesión de usuario.' });
            socket.disconnect(true);
            return null;
        }

        let character = userEntity.playerCharacter;
        if (!character) {
            console.log(`  Creando nuevo PlayerCharacter para ${userEntity.username}...`);
            const newPc = playerCharacterRepository.create({ 
                user: userEntity,
                bodyStyle: 'male_base_white', 
                hairStyle: 'hair_none',     
                shirtStyle: 'purple_shirt', 
                pantsStyle: 'pants_none',
            });
            character = await playerCharacterRepository.save(newPc);
            userEntity.playerCharacter = character; 
        }
        
        const playerInfo: ActivePlayerInfo = {
            socketId: socket.id,
            userId: userEntity.id,
            username: userEntity.username,
            characterId: character.id,
            x: character.x,
            y: character.y,
            bodyStyle: character.bodyStyle,
            hairStyle: character.hairStyle,
            shirtStyle: character.shirtStyle,
            pantsStyle: character.pantsStyle,
            currentRoomId: character.currentRoomId 
        };
        activePlayers[socket.id] = playerInfo;
        console.log(`  ${userEntity.username} (CharID: ${character.id}) inicializado en activePlayers.`);
        
        if (playerInfo.currentRoomId) {
            socket.join(playerInfo.currentRoomId);
            console.log(`  ${playerInfo.username} re-unido a la sala de Socket.IO: ${playerInfo.currentRoomId}`);
        }
        return playerInfo;
    };

    initializePlayerSession().then(playerInfo => {
        if (playerInfo) {
            roomService.getActiveRooms().then(rooms => {
                const roomListData = rooms.map(room => ({
                    id: room.id, name: room.name,
                    playerCount: room.playerCharacters?.length || 0,
                    maxPlayers: room.maxPlayers,
                        status: room.status, 
                }));
                socket.emit('room_list_update', roomListData);
            });
        }
    });
   socket.on('get_room_list_request', async (callbackOrNoArg?: any) => { 
    const playerInfo = activePlayers[socket.id];
    const usernameForLog = playerInfo?.username || socket.id;
    console.log(`SOCKET EVENT [get_room_list_request]: Recibido de ${usernameForLog}`);

    try {
        const roomsFromService = await roomService.getActiveRooms();
        
        console.log(`[get_room_list_request] Para ${usernameForLog} - Rooms desde RoomService:`, 
            roomsFromService.length, 
            "salas. Ejemplo primera sala (si existe):", 
            JSON.stringify(roomsFromService[0], null, 2) 
        );

        const roomListData = roomsFromService.map(room => {
            try {
                return {
                    id: room.id,
                    name: room.name,
                    playerCount: room.playerCharacters?.length || 0,
                    maxPlayers: room.maxPlayers,
                    status: room.status,
                };
            } catch (mapError: any) {
                console.error(`[get_room_list_request] Error al MAPEAR la sala con ID ${room?.id} y nombre ${room?.name}:`, mapError.message, mapError.stack);
                return null;
            }
        }).filter(room => room !== null); 
        console.log(`[get_room_list_request] Para ${usernameForLog} - RoomListData a emitir:`, JSON.stringify(roomListData));
        if (typeof callbackOrNoArg === 'function') {
            callbackOrNoArg({ success: true, rooms: roomListData });
        } else {
            socket.emit('room_list_update', roomListData);
        }
        console.log(`[get_room_list_request] Para ${usernameForLog} - Lista de salas emitida/enviada por callback.`);

    } catch (error: any) {
        console.error(`Error FATAL en get_room_list_request para ${usernameForLog}:`, error.message, error.stack);
        if (typeof callbackOrNoArg === 'function') {
            callbackOrNoArg({ success: false, error: "Error crítico al obtener lista de salas." });
        } else {
            socket.emit('game_error', { message: "Error crítico al obtener lista de salas." });
            socket.emit('room_list_update', []); 
        }
    }
});
    socket.on('create_room_request', async (data: { roomName: string, maxPlayers?: number }) => {
        let playerInfo = activePlayers[socket.id];
        if (!playerInfo || !playerInfo.characterId) { 
             playerInfo = await initializePlayerSession() || playerInfo; 
             if (!playerInfo?.characterId) {
                socket.emit('game_error', { message: "No se pudo identificar al personaje para crear la sala." });
                return;
             }
        }
        
        console.log(`SOCKET EVENT [create_room_request]: ${playerInfo.username} quiere crear sala '${data.roomName}'`);
        try {
            const newRoom = await roomService.createRoom(data.roomName, playerInfo.userId, data.maxPlayers || 4);
            const joinResult = await roomService.joinRoom(newRoom.id, playerInfo.characterId);

            if (joinResult && 'room' in joinResult) {
                socket.join(newRoom.id); 
                activePlayers[socket.id].currentRoomId = newRoom.id; 
                
                socket.emit('room_created_success', { 
                    roomId: newRoom.id,
                    name: newRoom.name,
                });
                console.log(`  ${playerInfo.username} creó y se unió a la sala ${newRoom.id}`);

                const rooms = await roomService.getActiveRooms();
                const roomListData = rooms.map(room => ({
                    id: room.id, name: room.name, 
                    playerCount: room.playerCharacters?.length || 0, maxPlayers: room.maxPlayers
                }));
                io.emit('room_list_update', roomListData); 

            } else {
                console.error("Error al hacer que el creador se una a su propia sala:", joinResult);
                socket.emit('game_error', { message: joinResult && 'error' in joinResult ? joinResult.error : "Error al unirse a la sala creada." });
            }
        } catch (error: any) {
            console.error("Error en create_room_request:", error);
            socket.emit('game_error', { message: error.message || "Error al crear la sala." });
        }
    });
    
    socket.on('join_room_request', async (data: { roomId: string }) => {
        let playerInfo = activePlayers[socket.id];
         if (!playerInfo || !playerInfo.characterId) {
             playerInfo = await initializePlayerSession() || playerInfo;
             if (!playerInfo?.characterId) {
                socket.emit('game_error', { message: "No se pudo identificar al personaje para unirse a la sala." });
                return;
             }
        }
        console.log(`SOCKET EVENT [join_room_request]: ${playerInfo.username} quiere unirse a sala ${data.roomId}`);
        try {
            if (playerInfo.currentRoomId && playerInfo.currentRoomId !== data.roomId) { 
                const oldRoomId = playerInfo.currentRoomId;
                await roomService.leaveRoom(playerInfo.characterId);
                socket.leave(oldRoomId);
                activePlayers[socket.id].currentRoomId = null;
                io.to(oldRoomId).emit('player_left_room_notification', { characterId: playerInfo.characterId, username: playerInfo.username });
            }

            const joinResult = await roomService.joinRoom(data.roomId, playerInfo.characterId);

            if (joinResult && 'room' in joinResult) {
                const room = joinResult.room;
                socket.join(room.id);
                activePlayers[socket.id].currentRoomId = room.id;

                socket.emit('join_room_success', { 
                    roomId: room.id, 
                    name: room.name, 
                });
                console.log(`  ${playerInfo.username} se unió a la sala ${room.id}. Cliente debe emitir 'player_ready_in_room'.`);
                socket.to(room.id).emit('new_player_joined', {
                    characterId: playerInfo.characterId,
                    username: playerInfo.username,
                    x: playerInfo.x, y: playerInfo.y,
                    bodyStyle: playerInfo.bodyStyle, hairStyle: playerInfo.hairStyle, shirtStyle: playerInfo.shirtStyle, pantsStyle: playerInfo.pantsStyle,
                });

                const activeRoomsList = await roomService.getActiveRooms();
                const roomListData = activeRoomsList.map(r => ({id: r.id, name: r.name, playerCount: r.playerCharacters?.length || 0, maxPlayers: r.maxPlayers }));
                io.emit('room_list_update', roomListData);

            } else {
                socket.emit('game_error', { message: joinResult && 'error' in joinResult ? joinResult.error : "No se pudo unir a la sala." });
            }
        } catch (error: any) { console.error("Error en join_room_request:", error);}
    });

    socket.on('player_ready_in_room', async (data: { roomId: string }) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo || playerInfo.currentRoomId !== data.roomId) {
            socket.emit('game_error', {message: 'Error: No estás sincronizado con la sala o datos incorrectos.'});
            console.warn(`player_ready_in_room: Discrepancia para ${playerInfo?.username}. currentRoomId: ${playerInfo?.currentRoomId}, requested: ${data.roomId}`);
            return;
        }
        console.log(`SOCKET EVENT [player_ready_in_room]: ${playerInfo.username} está listo en la sala ${data.roomId}`);
        
        const room = await roomService.getRoomById(data.roomId); 
        if (!room) {
            socket.emit('game_error', {message: 'La sala ya no existe.'});
            return;
        }

        const playersInRoom = room.playerCharacters || [];
        const playersInRoomData = playersInRoom.map(pc => {
            const activeP = Object.values(activePlayers).find(ap => ap.characterId === pc.id);
            return {
                characterId: pc.id,
                username: pc.user?.username || activeP?.username || 'Jugador', 
                x: pc.x, y: pc.y,
                bodyStyle: pc.bodyStyle, hairStyle: pc.hairStyle, shirtStyle: pc.shirtStyle, pantsStyle: pc.pantsStyle,
            };
        });
        let placedRoomItems: any[] = []; 
                try {
                   
                    placedRoomItems = await roomDecorationService.getPlacedItemsInRoom(data.roomId);
                    console.log(`[player_ready_in_room] Objetos obtenidos para sala ${data.roomId}: ${placedRoomItems.length}`);
                } catch (error) {
                    console.error(`Error obteniendo objetos para la sala ${data.roomId} en player_ready_in_room:`, error);
                }
        socket.emit('game_initial_setup', {
            playerData: { 
                characterId: playerInfo.characterId,
                username: playerInfo.username,
                x: playerInfo.x, y: playerInfo.y,
                bodyStyle: playerInfo.bodyStyle, hairStyle: playerInfo.hairStyle, shirtStyle: playerInfo.shirtStyle, pantsStyle: playerInfo.pantsStyle,
            },
            mapGrid: { 
                matrix: getGameGridMatrix(), cellSize: CELL_SIZE, gridCols: GRID_COLS, gridRows: GRID_ROWS, worldWidth: WORLD_WIDTH, worldHeight: WORLD_HEIGHT
            },
            existingPlayers: playersInRoomData.filter(p => p.characterId !== playerInfo.characterId),
             roomId: room.id, 
        roomName: room.name, 
        hostUserId: room.hostUserId, 
        placedItems: placedRoomItems, 

        });
        console.log(`  Enviado game_initial_setup para sala ${data.roomId} a ${playerInfo.username}`);
    });
    
    socket.on('leave_room_request', async () => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.characterId || !playerInfo.currentRoomId) {
            socket.emit('game_error', { message: "No estás en ninguna sala para salir." });
            return;
        }
        const roomId = playerInfo.currentRoomId;
        console.log(`SOCKET EVENT [leave_room_request]: ${playerInfo.username} quiere salir de la sala ${roomId}`);
        try {
            await roomService.leaveRoom(playerInfo.characterId);
            socket.leave(roomId);
            activePlayers[socket.id].currentRoomId = null; 

            socket.emit('left_room_success', { roomId }); 
            console.log(`  ${playerInfo.username} salió de la sala ${roomId}`);

            io.to(roomId).emit('player_left_room_notification', { 
                characterId: playerInfo.characterId, 
                username: playerInfo.username 
            });
            
            const activeRoomsList = await roomService.getActiveRooms();
            const roomListData = activeRoomsList.map(r => ({id: r.id, name: r.name, playerCount: r.playerCharacters?.length || 0, maxPlayers: r.maxPlayers}));
            io.emit('room_list_update', roomListData);

        } catch (error: any) {  }
    });


    socket.on('player_move_request', async (data: { targetX: number; targetY: number }) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo || !playerInfo.currentRoomId) { 
            socket.emit('game_error', { message: 'Debes estar en una sala para moverte.' });
            return;
        }
        
        console.log(`SOCKET EVENT [player_move_request]: ${playerInfo.username} en sala ${playerInfo.currentRoomId} desde (${playerInfo.x},${playerInfo.y}) a X:${data.targetX}, Y:${data.targetY}`);
        const startGridPos = worldToGridCoords(playerInfo.x, playerInfo.y);
        const targetGridPos = worldToGridCoords(data.targetX, data.targetY);
        const pathGridCoords = findPath(startGridPos.x, startGridPos.y, targetGridPos.x, targetGridPos.y);

        if (pathGridCoords && pathGridCoords.length > 0) {
            const worldPath = pathGridCoords.map(gridPos => gridToWorldCoords(gridPos[0], gridPos[1]));
            const finalWorldDestination = worldPath[worldPath.length - 1];

            playerInfo.x = finalWorldDestination.x; 
            playerInfo.y = finalWorldDestination.y;

            try {
                const playerCharacterRepository = AppDataSource.getRepository(PlayerCharacter);
                await playerCharacterRepository.update(playerInfo.characterId, { x: finalWorldDestination.x, y: finalWorldDestination.y });
                
                socket.emit('my_player_move_path', { path: worldPath });

                const payloadForOthers = {
                    characterId: playerInfo.characterId,
                    username: playerInfo.username,
                    x: playerInfo.x, y: playerInfo.y,
                    bodyStyle: playerInfo.bodyStyle, hairStyle: playerInfo.hairStyle, shirtStyle: playerInfo.shirtStyle, pantsStyle: playerInfo.pantsStyle,
                    path: worldPath,
                };

        socket.to(playerInfo.currentRoomId).except(socket.id).emit('other_player_moved', payloadForOthers);
                            } catch (error: any) {  }
                        } else {  }
                    });

    socket.on('send_chat_message', (data: { messageText: string }) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo || !data.messageText || data.messageText.trim() === '' || !playerInfo.currentRoomId) {
            return;
        }
        const messageText = data.messageText.trim();
        console.log(`CHAT [Sala: ${playerInfo.currentRoomId}] [${playerInfo.username}]: ${messageText}`);
        
        io.to(playerInfo.currentRoomId).emit('new_chat_message', {
            characterId: playerInfo.characterId,
            username: playerInfo.username,
            messageText: messageText,
            timestamp: new Date().toISOString(), 
        });
    });
socket.on('catalog:get_items', async (payload: { category?: string, name?: string }, callback) => {
            const playerInfo = activePlayers[socket.id];
        console.log(`SOCKET EVENT [catalog:get_items]: Recibido de ${playerInfo?.username || socket.id}`, payload);
        try {
            const items = await catalogService.getCatalogItems(payload);
            if (callback) callback({ success: true, items });
        } catch (error: any) {
            console.error("Error en catalog:get_items:", error);
            if (callback) callback({ success: false, error: error.message || "Error al obtener el catálogo." });
            socket.emit('game_error', { message: "Error al obtener el catálogo." });
        }
    });

    socket.on('shop:buy_item', async (payload: { catalogItemId: string }, callback) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) {
            const errorMsg = "Usuario no identificado para la compra.";
            if (callback) callback({ success: false, message: errorMsg });
            socket.emit('game_error', { message: errorMsg });
            return;
        }
        console.log(`SOCKET EVENT [shop:buy_item]: ${playerInfo.username} quiere comprar ${payload.catalogItemId}`);
        try {
            const result = await purchaseService.buyItem(playerInfo.userId, payload.catalogItemId);
            if (result.success) {
                socket.emit('shop:purchase_result', { success: true, message: result.message, inventoryItem: result.inventoryItem, newBalance: result.newBalance });
                socket.emit('user:currency_update', { newBalance: result.newBalance }); 
                 const updatedInventory = await inventoryService.getUserInventory(playerInfo.userId);
                 socket.emit('inventory:items_update', updatedInventory);
                 if (callback) callback({ success: true, message: result.message, inventoryItem: result.inventoryItem });
            } else {
                socket.emit('shop:purchase_result', { success: false, message: result.message });
                 if (callback) callback({ success: false, message: result.message });
            }
        } catch (error: any) {
            console.error("Error en shop:buy_item:", error);
            const errorMsg = error.message || "Error al procesar la compra.";
            socket.emit('shop:purchase_result', { success: false, message: errorMsg });
            if (callback) callback({ success: false, message: errorMsg });
        }
    });

    socket.on('inventory:get_items', async (callback) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) {
            const errorMsg = "Usuario no identificado para obtener inventario.";
            if (callback) callback({ success: false, error: errorMsg });
            socket.emit('game_error', { message: errorMsg });
            return;
        }
        console.log(`SOCKET EVENT [inventory:get_items]: Recibido de ${playerInfo.username}`);
        try {
            const items = await inventoryService.getUserInventory(playerInfo.userId);
            if (callback) callback({ success: true, items });
        } catch (error: any) {
            console.error("Error en inventory:get_items:", error);
            const errorMsg = error.message || "Error al obtener el inventario.";
             if (callback) callback({ success: false, error: errorMsg });
            socket.emit('game_error', { message: errorMsg });
        }
    });

    socket.on('room:get_placed_items', async (payload: { roomId: string }, callback) => {
        console.log(`SOCKET EVENT [room:get_placed_items]: Sala ${payload.roomId}`);
        try {
            const items = await roomDecorationService.getPlacedItemsInRoom(payload.roomId);
            if (callback) callback({ success: true, items });
        } catch (error: any) {
            console.error(`Error en room:get_placed_items para sala ${payload.roomId}:`, error);
            const errorMsg = error.message || "Error al obtener objetos de la sala.";
            if (callback) callback({ success: false, error: errorMsg });
            socket.emit('game_error', { message: errorMsg });
        }
    });

    socket.on('room:place_item', async (payload: {
        roomId: string;
        playerInventoryItemId: string;
        x: number;
        y: number;
        rotation?: number;
        zIndex?: number;
    }, callback) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) {  return; }
        console.log(`SOCKET EVENT [room:place_item]: ${playerInfo.username} quiere colocar item ${payload.playerInventoryItemId} en sala ${payload.roomId}`);
        try {
            const result = await roomDecorationService.placeItem(
                playerInfo.userId,
                payload.roomId,
                payload.playerInventoryItemId,
                payload.x,
                payload.y,
                payload.rotation,
                payload.zIndex
            );

            if ('error' in result) {
                if (callback) callback({ success: false, error: result.error });
                socket.emit('game_error', { message: result.error });
            } else {
                if (callback) callback({ success: true, placedItem: result });
                const allItemsInRoom = await roomDecorationService.getPlacedItemsInRoom(payload.roomId);
                io.to(payload.roomId).emit('room:placed_items_update', { roomId: payload.roomId, items: allItemsInRoom });
            }
        } catch (error: any) {  }
    });

    socket.on('room:move_item', async (payload: {
        roomId: string;
        roomPlacedItemId: string;
        x: number;
        y: number;
        rotation?: number;
        zIndex?: number;
    }, callback) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) {  return; }
        console.log(`SOCKET EVENT [room:move_item]: ${playerInfo.username} quiere mover ${payload.roomPlacedItemId} en sala ${payload.roomId}`);
        try {
            const result = await roomDecorationService.moveItem(
                playerInfo.userId,
                payload.roomId,
                payload.roomPlacedItemId,
                payload.x,
                payload.y,
                payload.rotation,
                payload.zIndex
            );
            if ('error' in result) {
                if (callback) callback({ success: false, error: result.error });
                socket.emit('game_error', { message: result.error });
            } else {
                if (callback) callback({ success: true, movedItem: result });
                const allItemsInRoom = await roomDecorationService.getPlacedItemsInRoom(payload.roomId);
                io.to(payload.roomId).emit('room:placed_items_update', { roomId: payload.roomId, items: allItemsInRoom });
            }
        } catch (error: any) {  }
    });

    socket.on('room:remove_item', async (payload: {
        roomId: string;
        roomPlacedItemId: string;
    }, callback) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) {  return; }
        console.log(`SOCKET EVENT [room:remove_item]: ${playerInfo.username} quiere remover ${payload.roomPlacedItemId} de sala ${payload.roomId}`);
        try {
            const result = await roomDecorationService.removeItem(playerInfo.userId, payload.roomId, payload.roomPlacedItemId);
            if (!result.success) {
                if (callback) callback({ success: false, error: result.message });
                socket.emit('game_error', { message: result.message });
            } else {
                if (callback) callback({ success: true, message: result.message });
                const allItemsInRoom = await roomDecorationService.getPlacedItemsInRoom(payload.roomId);
                io.to(payload.roomId).emit('room:placed_items_update', { roomId: payload.roomId, items: allItemsInRoom });
            }
        } catch (error: any) {  }
    });
    socket.on('rooms:get_my_created', async (callback) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) {
            console.warn("SOCKET EVENT [rooms:get_my_created]: Usuario no identificado.");
            if (callback) callback({ success: false, error: "Usuario no autenticado." });
            return;
        }
        console.log(`SOCKET EVENT [rooms:get_my_created]: Solicitud de ${playerInfo.username}`);
        try {
            const myRooms = await roomService.getRoomsByHost(playerInfo.userId);
            const roomListData = myRooms.map(room => ({
                id: room.id,
                name: room.name,
                playerCount: room.playerCharacters?.length || 0,
                maxPlayers: room.maxPlayers,
                status: room.status, 
                 hostUsername: room.host?.username 
            }));
            if (callback) callback({ success: true, rooms: roomListData });
        } catch (error: any) {
            console.error("Error en rooms:get_my_created:", error);
            if (callback) callback({ success: false, error: "Error al obtener tus salas creadas." });
        }
    });
     socket.on('player_change_appearance', async (newStyles: { bodyStyle?: string, hairStyle?: string, shirtStyle?: string, pantsStyle?: string }) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo || !playerInfo.characterId) {
            socket.emit('game_error', { message: 'No se pudo identificar al personaje.' });
            return;
        }
        console.log(`SOCKET EVENT [player_change_appearance]: ${playerInfo.username} (CharID: ${playerInfo.characterId}) solicita cambiar a:`, newStyles);
        try {
            const character = await roomService.updateCharacterAppearance(playerInfo.characterId, newStyles);
            if (character) {
                playerInfo.bodyStyle = character.bodyStyle;
                playerInfo.hairStyle = character.hairStyle;
                playerInfo.shirtStyle = character.shirtStyle;
                playerInfo.pantsStyle = character.pantsStyle;
                activePlayers[socket.id] = playerInfo;

                const appearanceData = {
                    characterId: character.id,
                    username: playerInfo.username, 
                    bodyStyle: character.bodyStyle,
                    hairStyle: character.hairStyle,
                    shirtStyle: character.shirtStyle,
                    pantsStyle: character.pantsStyle,
                };

                if (playerInfo.currentRoomId) {
                    io.to(playerInfo.currentRoomId).emit('player_appearance_changed', appearanceData);
                    console.log(`  Apariencia de ${playerInfo.username} actualizada y notificada a la sala ${playerInfo.currentRoomId}`);
                } else { 
                    socket.emit('player_appearance_changed', appearanceData);
                     console.log(`  Apariencia de ${playerInfo.username} actualizada (no está en una sala).`);
                }

            } else {
                socket.emit('game_error', { message: 'Error al actualizar la apariencia.' });
            }
        } catch (error: any) {
            console.error("Error en player_change_appearance:", error);
            socket.emit('game_error', { message: error.message || "Error al cambiar la apariencia." });
        }
    });

    socket.on('friends:send_request', async (data: { receiverUsername: string }, callback) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) return callback?.({ success: false, message: "Usuario no autenticado." });
        console.log(`SOCKET [friends:send_request]: ${playerInfo.username} -> ${data.receiverUsername}`);
        const result = await friendshipService.sendFriendRequest(playerInfo.userId, data.receiverUsername);
        callback?.(result);

        if (result.success && result.friendship) {
            const receiverUser = result.friendship.userId1 === playerInfo.userId ? result.friendship.user2 : result.friendship.user1; 
            const receiverSocketId = Object.values(activePlayers).find(p => p.userId === (playerInfo.userId === result.friendship?.userId1 ? result.friendship?.userId2 : result.friendship?.userId1))?.socketId;

            if (receiverSocketId) {
                io.to(receiverSocketId).emit('friends:new_request_received', {
                    friendshipId: result.friendship.id,
                    senderUsername: playerInfo.username, 
                    senderId: playerInfo.userId
                });
                console.log(` > Notificando a ${data.receiverUsername} (socket ${receiverSocketId}) sobre nueva solicitud de amistad.`);
            }
        }
    });

    socket.on('friends:respond_request', async (data: { friendshipId: string, action: 'accept' | 'decline' }, callback) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) return callback?.({ success: false, message: "Usuario no autenticado." });
        console.log(`SOCKET [friends:respond_request]: ${playerInfo.username} responde a ${data.friendshipId} con ${data.action}`);
        const result = await friendshipService.respondToFriendRequest(playerInfo.userId, data.friendshipId, data.action);
        callback?.(result);

        if (result.success && result.friendship) {
            const otherUserId = result.friendship.requestedByUserId === playerInfo.userId ? 
                               (result.friendship.userId1 === playerInfo.userId ? result.friendship.userId2 : result.friendship.userId1) 
                               : result.friendship.requestedByUserId; 

            const otherUserSocketId = Object.values(activePlayers).find(p => p.userId === otherUserId)?.socketId;

            if (data.action === 'accept') {
                socket.emit('friends:request_accepted', { friendship: result.friendship, friendUsername: result.friendship.requestedBy.username }); 
                if (otherUserSocketId) {
                    io.to(otherUserSocketId).emit('friends:request_accepted', { friendship: result.friendship, friendUsername: playerInfo.username }); 
                }
                socket.emit('friends:list_updated');
                if (otherUserSocketId) io.to(otherUserSocketId).emit('friends:list_updated');

            } else { 
                if (otherUserSocketId) { 
                    io.to(otherUserSocketId).emit('friends:request_declined', { friendshipId: data.friendshipId, declinerUsername: playerInfo.username });
                }
                 socket.emit('friends:list_updated'); 
            }
        }
    });

    socket.on('friends:remove_friend', async (data: { friendUserId: string }, callback) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) return callback?.({ success: false, message: "Usuario no autenticado." });
        console.log(`SOCKET [friends:remove_friend]: ${playerInfo.username} elimina a ${data.friendUserId}`);
        const result = await friendshipService.removeFriend(playerInfo.userId, data.friendUserId);
        callback?.(result);

        if (result.success) {
            const removedFriendSocketId = Object.values(activePlayers).find(p => p.userId === data.friendUserId)?.socketId;
            if (removedFriendSocketId) {
                io.to(removedFriendSocketId).emit('friends:friend_removed', { removerId: playerInfo.userId, removerUsername: playerInfo.username });
                io.to(removedFriendSocketId).emit('friends:list_updated');
            }
            socket.emit('friends:list_updated');
        }
    });

    socket.on('friends:get_list', async (callback) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) return callback?.({ success: false, error: "Usuario no autenticado." });
        const friends = await friendshipService.getFriends(playerInfo.userId);
        callback?.({ success: true, friends });
    });

    socket.on('friends:get_pending_requests', async (callback) => {
        const playerInfo = activePlayers[socket.id];

        if (!playerInfo?.userId) return callback?.({ success: false, error: "Usuario no autenticado." });
        const { sent, received } = await friendshipService.getPendingRequests(playerInfo.userId);
        
        const mapRequest = (f: Friendship, type: 'sent' | 'received') => {
            let otherUser;
            if (type === 'sent') { 
                otherUser = f.userId1 === playerInfo.userId ? f.user2 : f.user1;
            } else {
                otherUser = f.requestedBy;
            }
            return {
                id: f.id, 
                status: f.status,
                otherUser: {
                    id: otherUser.id,
                    username: otherUser.username,
                },
                createdAt: f.createdAt
            };
        };

        callback?.({ 
            success: true, 
            sent: sent.map(f => mapRequest(f, 'sent')), 
            received: received.map(f => mapRequest(f, 'received')) 
        });
    });

    socket.on('private_chat:send_message', async (
        data: { 
            receiverUserId: string; 
            messageText?: string | null; 
            imageUrl?: string;           
        }, 
        callback?: (response: { success: boolean; message?: any; error?: string }) => void
    ) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) {
            return callback?.({ success: false, error: "Usuario no autenticado para enviar mensaje." });
        }

        const messageType = data.imageUrl ? 'image' : 'text';
        const textContent = data.imageUrl ? (data.messageText || null) : data.messageText; 

        if (messageType === 'text' && (!textContent || !textContent.trim())) {
             return callback?.({ success: false, error: "El mensaje de texto no puede estar vacío." });
        }
        if (messageType === 'image' && !data.imageUrl) {
            return callback?.({ success: false, error: "Falta la URL de la imagen." });
        }

        console.log(`SOCKET [private_chat:send_message]: ${playerInfo.username} -> Usuario ${data.receiverUserId}. Tipo: ${messageType}`);

         const result = await privateChatService.sendMessage(
            playerInfo.userId,
            data.receiverUserId,
            textContent || null,
            messageType,
            data.imageUrl || null
        );

        if (result.success && result.message) {
            const messagePayload = { 
                id: result.message.id,
                friendshipId: result.message.friendshipId,
                senderId: result.message.senderId,
                senderUsername: result.message.senderUsername,
                receiverId: result.message.receiverId,
                messageText: result.message.messageText,
                messageType: result.message.messageType, 
                imageUrl: result.message.imageUrl,       
                timestamp: result.message.timestamp,
                isRead: result.message.isRead,
            };

            socket.emit('private_chat:new_message', messagePayload);
            const receiverSocketId = Object.values(activePlayers).find(p => p.userId === data.receiverUserId)?.socketId;
            if (receiverSocketId && receiverSocketId !== socket.id) {
                io.to(receiverSocketId).emit('private_chat:new_message', messagePayload);
            }
            callback?.({ success: true, message: messagePayload });
        } else {
            callback?.({ success: false, error: result.error });
        }
    });

    socket.on('private_chat:get_history', async (
        data: { friendUserId: string; limit?: number; beforeTimestamp?: string }, 
        callback
    ) => {
            const playerInfo = activePlayers[socket.id];

        if (!playerInfo?.userId) return callback?.({ success: false, error: "Usuario no autenticado." });
        console.log(`SOCKET [private_chat:get_history]: ${playerInfo.username} solicita historial con ${data.friendUserId}`);
        
        const result = await privateChatService.getChatHistory(playerInfo.userId, data.friendUserId, data.limit, data.beforeTimestamp);
        callback?.(result); 
    });

    socket.on('private_chat:mark_as_read', async (data: { friendUserId: string }, callback) => {
            const playerInfo = activePlayers[socket.id];

        if (!playerInfo?.userId) return callback?.({ success: false, error: "Usuario no autenticado." });
        console.log(`SOCKET [private_chat:mark_as_read]: ${playerInfo.username} marca mensajes con ${data.friendUserId} como leídos.`);
        
        const result = await privateChatService.markMessagesAsRead(playerInfo.userId, data.friendUserId);
        callback?.(result);
        
        if (result.success && (result.updatedCount || 0) > 0) {
            const unreadSummary = await privateChatService.getUnreadMessageSummary(playerInfo.userId);
            socket.emit('private_chat:unread_summary_update', unreadSummary); 
        }
    });

    const sendUnreadSummaryOnConnect = async () => {
            const playerInfo = activePlayers[socket.id];

        if (playerInfo?.userId) {
            const unreadSummary = await privateChatService.getUnreadMessageSummary(playerInfo.userId);
            socket.emit('private_chat:unread_summary_update', unreadSummary);
            console.log(`   Enviado resumen de mensajes no leídos a ${playerInfo.username}:`, unreadSummary);
        }
        if (playerInfo) { 
         sendUnreadSummaryOnConnect();
    } 
    };

    socket.on('voice_chat:initiate_call', (data: { targetUserId: string }) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) return; 
        console.log(`[VC] ${playerInfo.username} (socket ${socket.id}) quiere llamar a ${data.targetUserId}`);

        const targetPlayerInfo = Object.values(activePlayers).find(p => p.userId === data.targetUserId);
        if (targetPlayerInfo && targetPlayerInfo.socketId !== socket.id) {
           
            console.log(`[VC] Enviando incoming_call de ${playerInfo.username} a ${targetPlayerInfo.username} (socket ${targetPlayerInfo.socketId})`);
            io.to(targetPlayerInfo.socketId).emit('voice_chat:incoming_call', {
                callerId: playerInfo.userId,
                callerUsername: playerInfo.username,
            });
        } else {
            console.log(`[VC] No se pudo encontrar/notificar a targetUser ${data.targetUserId} para initiate_call.`);
            socket.emit('voice_chat:user_unavailable', { targetUserId: data.targetUserId });
        }
    });

    socket.on('voice_chat:accept_call', (data: { callerId: string }) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) return;
        console.log(`[VC] ${playerInfo.username} (socket ${socket.id}) aceptó la llamada de ${data.callerId}`);
        const callerPlayerInfo = Object.values(activePlayers).find(p => p.userId === data.callerId);
        if (callerPlayerInfo && callerPlayerInfo.socketId !== socket.id) {
            io.to(callerPlayerInfo.socketId).emit('voice_chat:call_accepted_by_peer', {
                accepterId: playerInfo.userId,
                accepterUsername: playerInfo.username,
            });
           
        }
    });

    socket.on('voice_chat:decline_call', (data: { callerId: string }) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) return;
        console.log(`[VC] ${playerInfo.username} (socket ${socket.id}) rechazó la llamada de ${data.callerId}`);
        const callerPlayerInfo = Object.values(activePlayers).find(p => p.userId === data.callerId);
        if (callerPlayerInfo && callerPlayerInfo.socketId !== socket.id) {
            io.to(callerPlayerInfo.socketId).emit('voice_chat:call_declined_by_peer', {
                declinerId: playerInfo.userId,
                declinerUsername: playerInfo.username,
            });
        }
    });
    socket.on('voice_chat:offer', (data: { targetUserId: string, sdpOffer: any }) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) return;
        const targetSocketId = Object.values(activePlayers).find(p => p.userId === data.targetUserId)?.socketId;
        if (targetSocketId && targetSocketId !== socket.id) {
            socket.to(targetSocketId).emit('voice_chat:offer_received', {
                senderId: playerInfo.userId,
                sdpOffer: data.sdpOffer,
            });
        }
    });

    socket.on('voice_chat:answer', (data: { targetUserId: string, sdpAnswer: any }) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) return;
        const targetSocketId = Object.values(activePlayers).find(p => p.userId === data.targetUserId)?.socketId;
        if (targetSocketId && targetSocketId !== socket.id) {
            socket.to(targetSocketId).emit('voice_chat:answer_received', {
                senderId: playerInfo.userId,
                sdpAnswer: data.sdpAnswer,
            });
        }
    });

  socket.on('voice_chat:ice_candidate', (data: { targetUserId: string, candidate: any }) => {
        const playerInfo = activePlayers[socket.id];
    if (!playerInfo?.userId) return;
    const candidateInfo = data.candidate ? `${data.candidate.candidate?.substring(0,30)}... (type: ${data.candidate.type})` : 'null';
    console.log(`[VC_SOCKET_RELAY] ICE Candidate de ${playerInfo.username} para ${data.targetUserId}. Candidato: ${candidateInfo}`);

    const targetSocketId = Object.values(activePlayers).find(p => p.userId === data.targetUserId)?.socketId;
    if (targetSocketId && targetSocketId !== socket.id) {
        socket.to(targetSocketId).emit('voice_chat:ice_candidate_received', {
            senderId: playerInfo.userId,
            candidate: data.candidate,
        });
    }
});

    socket.on('voice_chat:hang_up', (data: { targetUserId: string }) => {
        const playerInfo = activePlayers[socket.id];
        if (!playerInfo?.userId) return;
        console.log(`[VC] ${playerInfo.username} colgó con ${data.targetUserId}`);
        const targetSocketId = Object.values(activePlayers).find(p => p.userId === data.targetUserId)?.socketId;
        if (targetSocketId && targetSocketId !== socket.id) {
            io.to(targetSocketId).emit('voice_chat:call_ended', {
                leaverId: playerInfo.userId,
                leaverUsername: playerInfo.username,
            });
        }
        
    }); 
    socket.on('disconnect', async () => { 
        const playerInfo = activePlayers[socket.id];
        if (playerInfo) {
            console.log(`🔌 Usuario desconectado: ${playerInfo.username} (Socket ID: ${socket.id}, CharID: ${playerInfo.characterId})`);
            const roomId = playerInfo.currentRoomId;
            if (roomId) {
                await roomService.leaveRoom(playerInfo.characterId); 
                socket.leave(roomId); 
                io.to(roomId).emit('player_left_room_notification', { 
                    characterId: playerInfo.characterId,
                    username: playerInfo.username,
                });
                const activeRoomsList = await roomService.getActiveRooms();
                const roomListData = activeRoomsList.map(r => ({id: r.id, name: r.name, playerCount: r.playerCharacters?.length || 0, maxPlayers: r.maxPlayers}));
                io.emit('room_list_update', roomListData);
            }
            delete activePlayers[socket.id];
            console.log(`  ${playerInfo.username} eliminado de activePlayers. Total: ${Object.keys(activePlayers).length}`);
             if (playerInfo.inCallWithUserId) { 
            console.log(`[VC] ${playerInfo.username} estaba en llamada con ${playerInfo.inCallWithUserId} y se desconectó.`);
            const otherPlayerInCallInfo = Object.values(activePlayers).find(p => p.userId === playerInfo.inCallWithUserId);

            if (otherPlayerInCallInfo && activePlayers[otherPlayerInCallInfo.socketId]) { 
                io.to(otherPlayerInCallInfo.socketId).emit('voice_chat:call_ended', { 
                    leaverId: playerInfo.userId, 
                    leaverUsername: playerInfo.username, 
                    reason: 'disconnected' 
                });
                activePlayers[otherPlayerInCallInfo.socketId].inCallWithUserId = null; 
                console.log(`[VC] Notificado a ${otherPlayerInCallInfo.username} que ${playerInfo.username} se desconectó de la llamada.`);
            }
        }

        delete activePlayers[socket.id]; 
        console.log(`   ${playerInfo.username} eliminado de activePlayers. Total: ${Object.keys(activePlayers).length}`);
    } else {
        console.log(`🔌 Cliente Socket.IO desconectado (sin info de jugador activo en socket.data o activePlayers): ${socket.id}`);
    }
});
    
});
   const authController = new AuthController();
        app.use('/api/auth', authController.router);

        httpServer.listen(port, () => {
            console.log(`🚀 Backend Lotem escuchando en http://localhost:${port}`);
            console.log(`📡 Servidor Socket.IO (con autenticación y sync multijugador) iniciado.`);
        });
   
};
bootstrap();

   