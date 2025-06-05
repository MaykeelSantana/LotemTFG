import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PlayerInventoryItem } from '../../inventory/entities/PlayerInventoryItem.entity';
import { RoomPlacedItem } from '../../room/entities/RoomPlacedItem.entity';

/**
 * Entidad que representa un ítem disponible en el catálogo del juego.
 * Un CatalogItem puede estar en múltiples inventarios de jugadores y ser colocado en varias salas.
 */
@Entity('catalog_items')
export class CatalogItem {
    /**
     * Identificador único del ítem (UUID).
     */
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /**
     * Nombre único del ítem.
     */
    @Column({ type: 'varchar', length: 150, unique: true })
    name!: string;

    /**
     * Descripción opcional del ítem.
     */
    @Column({ type: 'text', nullable: true })
    description?: string;

    /**
     * Clave del recurso gráfico asociado al ítem (por ejemplo, spritesheet o tile).
     */
    @Column({ type: 'varchar', length: 100 })
    assetKey!: string;

    /**
     * Precio del ítem en la moneda del juego.
     */
    @Column({ type: 'int' })
    price!: number;

    /**
     * Categoría del ítem (por ejemplo: 'furniture', 'decoration', 'wall', 'floor').
     */
    @Column({ type: 'varchar', length: 50, default: 'decoration' })
    category!: string;

    /**
     * Indica si el ítem puede acumularse en el inventario del jugador.
     */
    @Column({ type: 'boolean', default: true })
    isStackableInInventory!: boolean;
    
    /**
     * Dimensiones del ítem en la cuadrícula del juego (ancho y alto).
     */
    @Column({ type: 'jsonb', nullable: true })
    dimensionsGrid?: { width: number; height: number };

    /**
     * Indica si el ítem puede colocarse en una sala.
     */
    @Column({ type: 'boolean', default: true })
    isPlaceableInRoom!: boolean;

    /**
     * Etiquetas de búsqueda asociadas al ítem.
     */
    @Column({ type: 'simple-array', nullable: true })
    tags?: string[];

    /**
     * Relación uno a muchos con PlayerInventoryItem.
     * Un ítem del catálogo puede estar en muchos inventarios de jugadores.
     */
    @OneToMany(() => PlayerInventoryItem, inventoryItem => inventoryItem.catalogItem)
    inventoryInstances!: PlayerInventoryItem[];

    /**
     * Relación uno a muchos con RoomPlacedItem.
     * Un ítem del catálogo puede estar colocado varias veces en diferentes salas.
     */
    @OneToMany(() => RoomPlacedItem, placedItem => placedItem.catalogItem)
    placedInstances!: RoomPlacedItem[];

    /**
     * Fecha de creación del ítem.
     */
    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    /**
     * Fecha de última actualización del ítem.
     */
    @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}