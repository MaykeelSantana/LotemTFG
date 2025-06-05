import AppDataSource from '../../config/data-source';
import { User } from '../auth/entities/User.entity';
import { Achievement, AchievementCriteriaType, AchievementRewardType } from './entities/Achievement.entity';
import { UserAchievement } from './entities/UserAchievement.entity';
import { Repository } from 'typeorm';
import { CurrencyService } from '../currency/currency.service';
import { InventoryService } from '../inventory/inventory.service';
import { CatalogItem } from '../catalog/entities/CatalogItem.entity';
import { PREDEFINED_ACHIEVEMENTS } from './achievement.definitions';

/**
 * Servicio para la gestión de logros (achievements) en la aplicación.
 * Permite sincronizar logros predefinidos, procesar eventos de juego para actualizar el progreso,
 * otorgar recompensas y consultar el estado de los logros de un usuario.
 */
export class AchievementService {
    private achievementRepository: Repository<Achievement>;
    private userAchievementRepository: Repository<UserAchievement>;
    private currencyService: CurrencyService;
    private inventoryService: InventoryService;
    private catalogItemRepository: Repository<CatalogItem>;

    /**
     * Inicializa el servicio de logros.
     * @param currencyService Servicio para la gestión de monedas/créditos.
     * @param inventoryService Servicio para la gestión de inventario de usuarios.
     */
    constructor(
        currencyService: CurrencyService, 
        inventoryService: InventoryService
    ) {
        this.achievementRepository = AppDataSource.getRepository(Achievement);
        this.userAchievementRepository = AppDataSource.getRepository(UserAchievement);
        this.catalogItemRepository = AppDataSource.getRepository(CatalogItem);
        this.currencyService = currencyService;
        this.inventoryService = inventoryService;
    }

    /**
     * Sincroniza los logros predefinidos con la base de datos.
     * Crea o actualiza los logros definidos en el sistema.
     * Idealmente se ejecuta una vez al inicio de la aplicación.
     */
    public async syncPredefinedAchievements(): Promise<void> {
        for (const achDef of PREDEFINED_ACHIEVEMENTS) {
            let achievement = await this.achievementRepository.findOneBy({ id: achDef.id });
            const dataToSave = {
                name: achDef.name,
                description: achDef.description,
                criteriaType: achDef.criteriaType,
                criteriaThreshold: achDef.criteriaThreshold ?? null,
                criteriaTargetId: achDef.criteriaTargetId ?? null,
                rewardType: achDef.rewardType,
                rewardValue: achDef.rewardValue ?? null,
                rewardCatalogItemId: achDef.rewardCatalogItemId ?? null,
                iconUrl: achDef.iconUrl ?? null,
                isActive: achDef.isActive !== undefined ? achDef.isActive : true,
            };

            if (!achievement) {
                achievement = this.achievementRepository.create({ 
                    id: achDef.id, 
                    ...dataToSave, 
                    iconUrl: achDef.iconUrl ?? undefined
                });
            } else {
                Object.assign(achievement, dataToSave);
            }
            await this.achievementRepository.save(achievement);
        }
    }

    /**
     * Obtiene o crea una entrada de UserAchievement para un usuario y logro específico.
     * @param userId ID del usuario.
     * @param achievementId ID del logro.
     * @returns La entidad UserAchievement correspondiente o null si el logro no existe o está inactivo.
     */
    private async getOrCreateUserAchievement(userId: string, achievementId: string): Promise<UserAchievement | null> {
        const achievementDefinition = await this.achievementRepository.findOneBy({ id: achievementId, isActive: true });
        if (!achievementDefinition) {
            return null;
        }

        let userAchievement = await this.userAchievementRepository.findOne({
            where: { userId, achievementId },
            relations: ['achievement'],
        });

        if (!userAchievement) {
            userAchievement = this.userAchievementRepository.create({
                userId,
                achievementId,
                achievement: achievementDefinition,
                progress: 0,
                isUnlocked: false,
                isRewardClaimed: false,
            });
        } else if (!userAchievement.achievement) {
            userAchievement.achievement = achievementDefinition;
        }
        return userAchievement;
    }

    /**
     * Otorga la recompensa asociada a un logro desbloqueado.
     * Marca la recompensa como reclamada.
     * @param userId ID del usuario.
     * @param userAchievement Entidad UserAchievement con la relación cargada.
     * @returns Descripción de la recompensa otorgada o mensaje de error.
     */
    private async grantReward(userId: string, userAchievement: UserAchievement): Promise<string | null> {
        if (userAchievement.isRewardClaimed) return "Recompensa ya reclamada.";
        if (!userAchievement.achievement) {
            return "Error interno al otorgar recompensa.";
        }

        const achievement = userAchievement.achievement;
        let rewardFeedback: string | null = null;

        switch (achievement.rewardType) {
            case AchievementRewardType.CREDITS:
                if (achievement.rewardValue && achievement.rewardValue > 0) {
                    await this.currencyService.addCurrency(userId, achievement.rewardValue);
                    rewardFeedback = `¡Has ganado ${achievement.rewardValue} créditos!`;
                }
                break;
            case AchievementRewardType.ITEM:
                if (achievement.rewardCatalogItemId && achievement.rewardValue && achievement.rewardValue > 0) {
                    const itemData = await this.catalogItemRepository.findOneBy({id: achievement.rewardCatalogItemId});
                    if(itemData){
                        const invResult = await this.inventoryService.addItemToInventory(userId, achievement.rewardCatalogItemId, achievement.rewardValue);
                        if (!('error' in invResult)) {
                            rewardFeedback = `¡Has recibido ${itemData.name} (x${achievement.rewardValue})!`;
                        } else {
                            return "Error al otorgar el ítem recompensa.";
                        }
                    } else {
                        return "Ítem recompensa no disponible.";
                    }
                }
                break;
            default:
                break;
        }

        userAchievement.isRewardClaimed = true;
        await this.userAchievementRepository.save(userAchievement);
        return rewardFeedback;
    }

    /**
     * Procesa un evento del juego y actualiza el progreso de los logros relacionados.
     * Si se desbloquea un logro, otorga la recompensa correspondiente.
     * @param userId ID del usuario.
     * @param eventType Tipo de evento (criterio del logro).
     * @param eventData Datos adicionales del evento (ej: catalogItemId, cantidad).
     * @returns Información del logro desbloqueado y la recompensa, o null si no se desbloqueó ningún logro.
     */
    public async processGameEvent(
        userId: string,
        eventType: AchievementCriteriaType,
        eventData: { catalogItemId?: string; quantity?: number; } = {}
    ): Promise<{ achievementName: string; achievementDescription: string; rewardDescription: string | null } | null> {
        
        const relevantAchievements = await this.achievementRepository.find({
            where: { criteriaType: eventType, isActive: true }
        });

        for (const achievement of relevantAchievements) {
            const userAch = await this.getOrCreateUserAchievement(userId, achievement.id);
            if (!userAch || userAch.isUnlocked) continue;

            let progressMadeThisEvent = false;

            if (achievement.criteriaType === AchievementCriteriaType.ITEM_PURCHASE_COUNT) {
                if (eventData.quantity && eventData.quantity > 0) {
                    userAch.progress += eventData.quantity;
                    progressMadeThisEvent = true;
                }
            } else if (achievement.criteriaType === AchievementCriteriaType.SPECIFIC_ITEM_PURCHASED) {
                if (eventData.catalogItemId === achievement.criteriaTargetId && eventData.quantity && eventData.quantity > 0) {
                    userAch.progress += eventData.quantity; 
                    progressMadeThisEvent = true;
                }
            }

            if (progressMadeThisEvent) {
                if (achievement.criteriaThreshold && userAch.progress >= achievement.criteriaThreshold) {
                    userAch.isUnlocked = true;
                    userAch.unlockedAt = new Date();
                    
                    const rewardDescription = await this.grantReward(userId, userAch);
                    await this.userAchievementRepository.save(userAch);

                    return {
                        achievementName: achievement.name,
                        achievementDescription: achievement.description,
                        rewardDescription
                    };
                } else {
                    await this.userAchievementRepository.save(userAch);
                }
            }
        }
        return null;
    }

    /**
     * Obtiene el estado de todos los logros para un usuario.
     * Devuelve tanto los logros desbloqueados como los pendientes, con su progreso actual.
     * @param userId ID del usuario.
     * @returns Lista de UserAchievement, incluyendo entradas virtuales para logros aún no iniciados.
     */
    public async getUserAchievementsStatus(userId: string): Promise<UserAchievement[]> {
        const existingUserAchievements = await this.userAchievementRepository.find({
            where: { userId },
            relations: ['achievement'],
        });
        const existingMap = new Map(existingUserAchievements.map(ua => [ua.achievementId, ua]));

        const allDefinedAchievements = await this.achievementRepository.find({ where: { isActive: true }});
        
        const fullStatus: UserAchievement[] = [];

        for (const achievementDef of allDefinedAchievements) {
            if (existingMap.has(achievementDef.id)) {
                fullStatus.push(existingMap.get(achievementDef.id)!);
            } else {
                const virtualUserAch = this.userAchievementRepository.create({
                    userId,
                    achievementId: achievementDef.id,
                    achievement: achievementDef,
                    progress: 0,
                    isUnlocked: false,
                    isRewardClaimed: false,
                });
                fullStatus.push(virtualUserAch);
            }
        }
        return fullStatus.sort((a,b) => a.achievement.name.localeCompare(b.achievement.name));
    }
}