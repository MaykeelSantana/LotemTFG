import AppDataSource from '../../config/data-source';
import { User } from '../auth/entities/User.entity'; // Ajusta la ruta

export class CurrencyService {
    private userRepository = AppDataSource.getRepository(User);

    async getUserBalance(userId: string): Promise<number | null> {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            console.error(`CurrencyService: Usuario ${userId} no encontrado.`);
            return null;
        }
        return user.currencyBalance;
    }

    async deductCurrency(userId: string, amount: number): Promise<{ success: boolean, newBalance?: number, error?: string }> {
        if (amount <= 0) {
            return { success: false, error: 'La cantidad a deducir debe ser positiva.' };
        }
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            return { success: false, error: `Usuario ${userId} no encontrado.` };
        }
        if (user.currencyBalance < amount) {
            return { success: false, error: 'Saldo insuficiente.' };
        }
        user.currencyBalance -= amount;
        await this.userRepository.save(user);
        return { success: true, newBalance: user.currencyBalance };
    }

    async addCurrency(userId: string, amount: number): Promise<{ success: boolean, newBalance?: number, error?: string }> {
        if (amount <= 0) {
            return { success: false, error: 'La cantidad a añadir debe ser positiva.' };
        }
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            return { success: false, error: `Usuario ${userId} no encontrado.` };
        }
        user.currencyBalance += amount;
        await this.userRepository.save(user);
        return { success: true, newBalance: user.currencyBalance };
    }
}