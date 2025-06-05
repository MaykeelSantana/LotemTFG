import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Room } from './Room.entity';
import { User } from '../../auth/entities/User.entity';
import { CatalogItem } from '../../catalog/entities/CatalogItem.entity';

/**
 * Entidad que representa un objeto colocado dentro de una sala.
 * Cada instancia corresponde a un ítem específico ubicado en una posición determinada,
 * con propiedades particulares y referencias a la sala, el usuario que lo colocó y el ítem de catálogo.
 */
@Entity('room_placed_items')
export class RoomPlacedItem {
    /**
     * Identificador único de la instancia del objeto colocado.
     */
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /**
     * Identificador de la sala donde se encuentra el objeto.
     */
    @Column({ type: 'uuid' })
    roomId!: string;

    /**
     * Referencia a la entidad Room asociada.
     * Si la sala se elimina, también se eliminan sus objetos colocados.
     */
    @ManyToOne(() => Room, room => room.placedItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'roomId' })
    room!: Room;

    /**
     * Identificador del ítem de catálogo que representa este objeto.
     */
    @Column({ type: 'uuid' })
    catalogItemId!: string;

    /**
     * Referencia al ítem de catálogo asociado.
     * Se carga automáticamente al consultar la entidad.
     */
    @ManyToOne(() => CatalogItem, catalogItem => catalogItem.placedInstances, { eager: true })
    @JoinColumn({ name: 'catalogItemId' })
    catalogItem!: CatalogItem;

    /**
     * Identificador del usuario que colocó el objeto.
     */
    @Column({ type: 'uuid' })
    placedByUserId!: string; 

    /**
     * Referencia al usuario que colocó el objeto.
     * Si el usuario se elimina, el objeto permanece pero sin dueño directo.
     */
    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'placedByUserId' })
    placedByUser?: User;

    /**
     * Posición X del objeto dentro de la sala.
     */
    @Column({ type: 'float' })
    x!: number;

    /**
     * Posición Y del objeto dentro de la sala.
     */
    @Column({ type: 'float' })
    y!: number;

    /**
     * Rotación del objeto en grados (ejemplo: 0, 90, 180, 270).
     */
    @Column({ type: 'int', default: 0 })
    rotation!: number;

    /**
     * Índice de profundidad para controlar el orden de dibujo (opcional).
     */
    @Column({ type: 'int', default: 0, nullable: true })
    zIndex?: number;

    /**
     * Propiedades específicas de esta instancia del objeto (ejemplo: color, contenido).
     */
    @Column({type: 'jsonb', nullable: true })
    instanceProperties?: any;

    /**
     * Fecha y hora de creación del registro.
     */
    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    /**
     * Fecha y hora de la última actualización del registro.
     */
    @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}