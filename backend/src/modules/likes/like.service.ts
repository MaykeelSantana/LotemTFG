import AppDataSource from '../../config/data-source';
import { Post } from '../posts/entities/Post.entity';
import { Like } from './entities/Like.entity';
import { Repository, In } from 'typeorm'; 

export class LikeService {
    private likeRepository: Repository<Like>;
    private postRepository: Repository<Post>;

    constructor() {
        this.likeRepository = AppDataSource.getRepository(Like);
        this.postRepository = AppDataSource.getRepository(Post);
    }

    async likePost(userId: string, postId: string): Promise<{ success: boolean; post?: Post; message?: string; alreadyLiked?: boolean }> {
        const post = await this.postRepository.findOneBy({ id: postId });
        if (!post) return { success: false, message: "Post no encontrado." };

        const existingLike = await this.likeRepository.findOneBy({ userId, postId });
        if (existingLike) {
            return { success: true, post, message: "Ya le has dado Me Gusta a este post.", alreadyLiked: true };
        }

        const newLike = this.likeRepository.create({ userId, postId, post });
        await this.likeRepository.save(newLike);

        const likeCount = await this.likeRepository.count({ where: { postId } });
        post.likeCount = likeCount;
        await this.postRepository.save(post);
        
        console.log(`LikeService: Usuario ${userId} dio like al post ${postId}. Nuevo likeCount: ${post.likeCount}`);
        return { success: true, post };
    }

    async unlikePost(userId: string, postId: string): Promise<{ success: boolean; post?: Post; message?: string }> {
        const like = await this.likeRepository.findOneBy({ userId, postId });
        if (!like) {
            return { success: false, message: "No le habías dado Me Gusta a este post." };
        }

        await this.likeRepository.remove(like);

        const post = await this.postRepository.findOneBy({ id: postId });
        if (post) {
            const likeCount = await this.likeRepository.count({ where: { postId } });
            post.likeCount = likeCount;
            await this.postRepository.save(post);
            console.log(`LikeService: Usuario ${userId} quitó like del post ${postId}. Nuevo likeCount: ${post.likeCount}`);
            return { success: true, post };
        }
        return { success: true, message: "Like eliminado, pero el post no se encontró para actualizar contador." };
    }

    async getLikedPostIdsByUser(userId: string, postIds: string[]): Promise<string[]> {
        if (!postIds || postIds.length === 0) return [];
        const likes = await this.likeRepository.find({
            where: { userId: userId, postId: In(postIds) },
            select: ['postId']
        });
        return likes.map(like => like.postId);
    }

    async didUserLikePost(userId: string, postId: string): Promise<boolean> { 
        const like = await this.likeRepository.countBy({userId, postId});
        return like > 0;
    }
}