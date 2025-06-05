import AppDataSource from '../../config/data-source';
import { Post, PostStatus, PostType } from './entities/Post.entity';
import { Repository, FindManyOptions, FindOptionsWhere, ILike, In } from 'typeorm';

/**
 * DTO para la creación de un post.
 */
interface CreatePostDto {
    title?: string | null;
    contentText: string;
    imageUrl?: string | null;
    type: PostType;
    status?: PostStatus;
}

/**
 * DTO para la actualización de un post.
 */
interface UpdatePostDto {
    title?: string | null;
    contentText?: string;
    imageUrl?: string | null;
    type?: PostType;
    status?: PostStatus;
}

/**
 * Servicio para la gestión de posts.
 * Permite crear, actualizar, eliminar y consultar posts tanto para la CMS como para el feed del juego.
 */
export class PostService {
    private postRepository: Repository<Post>;

    constructor() {
        this.postRepository = AppDataSource.getRepository(Post);
    }

    /**
     * Crea un nuevo post.
     * @param dto Datos para la creación del post.
     * @param authorIdFromCMS ID del autor autenticado en la CMS.
     * @returns El post creado o un objeto de error.
     */
    async createPost(dto: CreatePostDto, authorIdFromCMS: string): Promise<Post | { error: string }> {
        const post = this.postRepository.create({
            ...dto,
            authorId: authorIdFromCMS,
            status: dto.status || PostStatus.DRAFT,
            publishedAt: (dto.status === PostStatus.PUBLISHED) ? new Date() : null,
            likeCount: 0,
            commentCount: 0,
        });
        return this.postRepository.save(post);
    }

    /**
     * Actualiza un post existente.
     * @param postId ID del post a actualizar.
     * @param dto Datos a actualizar.
     * @param authorIdFromCMS ID del autor autenticado en la CMS.
     * @returns El post actualizado o un objeto de error.
     */
    async updatePost(postId: string, dto: UpdatePostDto, authorIdFromCMS: string): Promise<Post | { error: string }> {
        const post = await this.postRepository.findOneBy({ id: postId });
        if (!post) return { error: "Post no encontrado." };

        if (dto.status === PostStatus.PUBLISHED && post.status !== PostStatus.PUBLISHED) {
            post.publishedAt = new Date();
        }
        if (dto.status === PostStatus.DRAFT && post.status === PostStatus.PUBLISHED) {
            post.publishedAt = null;
        }

        Object.assign(post, dto);
        return this.postRepository.save(post);
    }

    /**
     * Elimina un post.
     * @param postId ID del post a eliminar.
     * @param authorIdFromCMS ID del autor autenticado en la CMS.
     * @returns Resultado de la operación.
     */
    async deletePost(postId: string, authorIdFromCMS: string): Promise<{ success: boolean; message?: string } | { error: string }> {
        const post = await this.postRepository.findOneBy({ id: postId });
        if (!post) return { error: "Post no encontrado." };
        await this.postRepository.remove(post);
        return { success: true, message: "Post eliminado." };
    }

    /**
     * Obtiene todos los posts para la CMS, incluyendo borradores y filtrado por tipo, estado o término de búsqueda.
     * @param options Opciones de paginación, filtrado y búsqueda.
     * @returns Lista de posts y el total de resultados.
     */
    async findAllPostsForCMS(options: { page?: number, limit?: number, type?: PostType, status?: PostStatus, searchTerm?: string }): Promise<{ posts: Post[], total: number }> {
        const { page = 1, limit = 10, type, status, searchTerm } = options;
        const skip = (page - 1) * limit;

        const baseWhere: FindOptionsWhere<Post> = {};
        if (status) baseWhere.status = status;

        if (type) {
            if (Array.isArray(type) && type.length > 0) {
                baseWhere.type = In(type as PostType[]);
            } else if (typeof type === 'string') {
                baseWhere.type = type as PostType;
            }
        }

        const whereConditions: FindOptionsWhere<Post>[] = [];
        if (searchTerm) {
            whereConditions.push({ ...baseWhere, title: ILike(`%${searchTerm}%`) });
            whereConditions.push({ ...baseWhere, contentText: ILike(`%${searchTerm}%`) });
        } else {
            whereConditions.push(baseWhere);
        }

        const [posts, total] = await this.postRepository.findAndCount({
            where: whereConditions.length && Object.keys(whereConditions[0]).length ? whereConditions : undefined,
            order: { createdAt: 'DESC' },
            take: limit,
            skip: skip,
            relations: ['author'],
        });
        return { posts, total };
    }

    /**
     * Obtiene posts publicados para el feed del juego, con opción de filtrar por tipo.
     * @param options Opciones de paginación y filtrado por tipo.
     * @returns Lista de posts publicados y el total de resultados.
     */
    async getPublishedPostsForFeed(options: { 
        page?: number, 
        limit?: number, 
        type?: PostType | PostType[]
    }): Promise<{ posts: Post[], total: number }> {
        const { page = 1, limit = 10, type } = options;
        const skip = (page - 1) * limit;

        const whereOptions: FindOptionsWhere<Post> = { status: PostStatus.PUBLISHED };

        if (type) {
            if (Array.isArray(type) && type.length > 0) {
                whereOptions.type = In(type as PostType[]); 
            } else if (typeof type === 'string') {
                whereOptions.type = type as PostType;
            }
        }

        const [posts, total] = await this.postRepository.findAndCount({
            where: whereOptions,
            order: { publishedAt: 'DESC', createdAt: 'DESC' },
            take: limit,
            skip: skip,
            relations: ['author'],
        });
        return { posts, total };
    }

    /**
     * Obtiene un post publicado por su ID.
     * @param postId ID del post.
     * @returns El post encontrado o null si no existe.
     */
    async getPublishedPostById(postId: string): Promise<Post | null> {
        return this.postRepository.findOne({
            where: { id: postId },
            relations: ['author']
        });
    }
}