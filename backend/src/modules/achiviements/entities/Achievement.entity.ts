import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { UserAchievement } from './UserAchievement.entity';
import { CatalogItem } from '../../catalog/entities/CatalogItem.entity';

/**
 * Tipos de criterios para obtener un logro.
 * - ITEM_PURCHASE_COUNT: Comprar una cantidad específica de ítems.
 * - SPECIFIC_ITEM_PURCHASED: Comprar un ítem específico.
 */
export enum AchievementCriteriaType {
    ITEM_PURCHASE_COUNT = 'item_purchase_count',
    SPECIFIC_ITEM_PURCHASED = 'specific_item_purchased',
    // Otros tipos pueden agregarse aquí (ej: login_days_consecutive, rooms_visited, etc.)
}

/**
 * Tipos de recompensa que puede otorgar un logro.
 * - CREDITS: Recompensa en créditos.
 * - ITEM: Recompensa con un ítem específico.
 */
export enum AchievementRewardType {
    CREDITS = 'credits',
    ITEM = 'item',
    // Otros tipos pueden agregarse aquí (ej: badge, title, etc.)
}

/**
 * Entidad que representa un logro dentro del sistema.
 * Un logro puede estar asociado a diferentes criterios y recompensas.
 */
@Entity('achievements')
export class Achievement {
    /**
     * Identificador único del logro (ejemplo: 'BUY_2_ITEMS_GENERIC').
     */
    @PrimaryColumn({ type: 'varchar', length: 50 })
    id!: string;

    /**
     * Nombre del logro.
     */
    @Column({ type: 'varchar', length: 100 })
    name!: string;

    /**
     * Descripción detallada del logro.
     */
    @Column('text')
    description!: string;

    /**
     * Tipo de criterio necesario para obtener el logro.
     */
    @Column({
        type: 'enum',
        enum: AchievementCriteriaType,
    })
    criteriaType!: AchievementCriteriaType;

    /**
     * Umbral numérico para cumplir el criterio (ejemplo: cantidad de ítems a comprar).
     * Puede ser nulo si el criterio no lo requiere.
     */
    @Column({ type: 'int', nullable: true })
    criteriaThreshold!: number | null;

    /**
     * Identificador de un objetivo específico para el criterio (ejemplo: ID de un ítem).
     * Puede ser nulo si el criterio no lo requiere.
     */
    @Column({ type: 'varchar', nullable: true })
    criteriaTargetId!: string | null;

    /**
     * Tipo de recompensa otorgada al cumplir el logro.
     */
    @Column({
        type: 'enum',
        enum: AchievementRewardType,
    })
    rewardType!: AchievementRewardType;

    /**
     * Valor de la recompensa (ejemplo: cantidad de créditos o ID del ítem).
     * Puede ser nulo si la recompensa no lo requiere.
     */
    @Column({ type: 'int', nullable: true })
    rewardValue!: number | null;

    /**
     * Identificador del ítem de catálogo otorgado como recompensa (si aplica).
     */
    @Column({ type: 'varchar', nullable: true })
    rewardCatalogItemId!: string | null;

    /**
     * Relación con el ítem de catálogo otorgado como recompensa.
     */
    @ManyToOne(() => CatalogItem, { nullable: true, eager: false })
    rewardItem!: CatalogItem;

    /**
     * URL del ícono representativo del logro.
     */
    @Column({ nullable: true })
    iconUrl!: string;

    /**
     * Indica si el logro está activo.
     */
    @Column({ default: true })
    isActive!: boolean;

    /**
     * Fecha de creación del logro.
     */
    @CreateDateColumn()
    createdAt!: Date;

    /**
     * Relación con los logros obtenidos por los usuarios.
     */
    @OneToMany(() => UserAchievement, (userAchievement: UserAchievement) => userAchievement.achievement)
    userAchievements!: UserAchievement[];
}