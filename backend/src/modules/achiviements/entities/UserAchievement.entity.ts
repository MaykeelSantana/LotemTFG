import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/User.entity';
import { Achievement } from './Achievement.entity';

/**
 * Entidad que representa la relación entre un usuario y un logro específico.
 * Permite almacenar el progreso, el estado de desbloqueo y la reclamación de recompensas.
 */
@Entity('user_achievements')
@Index(['userId', 'achievementId'], { unique: true })
export class UserAchievement {
    /**
     * Identificador único de la relación usuario-logro.
     */
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /**
     * Identificador del usuario asociado.
     */
    @Column()
    userId!: string;

    /**
     * Referencia al usuario asociado.
     */
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    /**
     * Identificador del logro asociado.
     */
    @Column()
    achievementId!: string;

    /**
     * Referencia al logro asociado. Se carga automáticamente con la entidad.
     */
    @ManyToOne(() => Achievement, { onDelete: 'CASCADE', eager: true })
    @JoinColumn({ name: 'achievementId' })
    achievement!: Achievement;

    /**
     * Progreso actual del usuario hacia el logro.
     */
    @Column({ type: 'int', default: 0 })
    progress!: number;

    /**
     * Indica si el logro ha sido desbloqueado por el usuario.
     */
    @Column({ default: false })
    isUnlocked!: boolean;

    /**
     * Fecha y hora en que el logro fue desbloqueado. Puede ser nulo si no ha sido desbloqueado.
     */
    @Column({ type: 'timestamp with time zone', nullable: true })
    unlockedAt!: Date | null;

    /**
     * Indica si la recompensa asociada al logro ya fue reclamada.
     */
    @Column({ default: false })
    isRewardClaimed!: boolean;

    /**
     * Fecha de creación del registro.
     */
    @CreateDateColumn()
    createdAt!: Date;

    /**
     * Fecha de la última actualización del registro.
     */
    @UpdateDateColumn()
    updatedAt!: Date;
}