import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { User } from '../entities/User.entity';

/**
 * Middleware de autenticación JWT para rutas protegidas.
 * 
 * Utiliza la estrategia 'jwt' de Passport para verificar el token JWT enviado en la solicitud.
 * Si la autenticación es exitosa, adjunta el usuario autenticado (sin el campo 'password') a req.user.
 * Si falla, responde con un error 401 y un mensaje adecuado.
 * 
 * @param req Objeto de solicitud de Express.
 * @param res Objeto de respuesta de Express.
 * @param next Función para pasar al siguiente middleware.
 */
export const jwtAuthGuard = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    passport.authenticate(
        'jwt',
        { session: false },
        (
            err: any,
            user: Omit<User, 'password'> | false,
            info: any
        ) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                let message = 'Acceso no autorizado.';
                if (info && info.name === 'TokenExpiredError') {
                    message = 'El token ha expirado.';
                }
                return res.status(401).json({ message });
            }
            req.user = user;
            return next();
        }
    )(req, res, next);
};