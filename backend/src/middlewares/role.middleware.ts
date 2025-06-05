import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../modules/auth/entities/User.entity'; 

export function ensureRole(roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User;
        if (!user) {
            res.status(401).json({ message: 'No autenticado.' });
            return;
        }
        if (!user.role || !roles.includes(user.role)) {
            res.status(403).json({ message: 'No autorizado.' });
            return;
        }
        next();
    };
}