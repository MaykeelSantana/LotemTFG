import AppDataSource from '../../config/data-source';
import { CatalogItem } from './entities/CatalogItem.entity'; // Ajusta la ruta
import { FindManyOptions, ILike } from 'typeorm';

export class CatalogService {
    private catalogItemRepository = AppDataSource.getRepository(CatalogItem);

    async getCatalogItems(filters?: { category?: string, name?: string }): Promise<CatalogItem[]> {
        const findOptions: FindManyOptions<CatalogItem> = {
            order: { name: 'ASC' } 
        };

        if (filters) {
            findOptions.where = {};
            if (filters.category) {
                findOptions.where.category = filters.category;
            }
            if (filters.name) {
                findOptions.where.name = ILike(`%${filters.name}%`);
            }
        }
        return this.catalogItemRepository.find(findOptions);
    }

    async findItemById(catalogItemId: string): Promise<CatalogItem | null> {
        return this.catalogItemRepository.findOneBy({ id: catalogItemId });
    }

   
}