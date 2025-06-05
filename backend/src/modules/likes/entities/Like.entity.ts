import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../../auth/entities/User.entity';
import { Post } from '../../posts/entities/Post.entity';

@Entity('likes')
@Unique(['userId', 'postId']) 
export class Like {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' }) 
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column()
    postId!: string;

    @ManyToOne(() => Post, post => post.likesReceived, { onDelete: 'CASCADE' }) 
    @JoinColumn({ name: 'postId' })
    post!: Post;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;
}