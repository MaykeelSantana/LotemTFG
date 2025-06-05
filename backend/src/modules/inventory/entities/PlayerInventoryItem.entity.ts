import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/User.entity'; 
import { CatalogItem } from '../../catalog/entities/CatalogItem.entity'; 

@Entity('player_inventory_items')
export class PlayerInventoryItem {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => User, user => user.inventoryItems, { onDelete: 'CASCADE' }) 
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column({ type: 'uuid' })
    catalogItemId!: string;

    @ManyToOne(() => CatalogItem, catalogItem => catalogItem.inventoryInstances, { eager: true })
    @JoinColumn({ name: 'catalogItemId' })
    catalogItem!: CatalogItem;

    @Column({ type: 'int', default: 1 })
    quantity!: number;

    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    acquiredAt!: Date;
}