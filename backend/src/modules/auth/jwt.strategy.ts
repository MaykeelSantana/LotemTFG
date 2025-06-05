// backend/src/modules/auth/jwt.strategy.ts

import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { PassportStatic } from 'passport';
import dotenv from 'dotenv';
import { AuthService } from './auth.service';
import { User } from './entities/User.entity';

dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

const opts: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET as string,
};

if (!process.env.JWT_SECRET) {
    throw new Error("FATAL ERROR: JWT_SECRET no está definido. La aplicación no puede iniciar la estrategia JWT.");
}

/**
 * Configura la estrategia JWT para Passport.
 * 
 * Esta función debe ser llamada en el archivo principal (main.ts) para registrar la estrategia JWT en Passport.
 * 
 * - Extrae el token JWT del encabezado "Authorization: Bearer <token>".
 * - Valida el token usando la clave secreta definida en las variables de entorno.
 * - Busca el usuario correspondiente al ID contenido en el payload del token.
 * - Si el usuario existe, lo adjunta a req.user (sin datos sensibles).
 * - Si el usuario no existe o hay un error, la autenticación falla.
 * 
 * @param passport Instancia de Passport sobre la que se registra la estrategia.
 */
export const configureJwtStrategy = (passport: PassportStatic) => {
    passport.use(
        new JwtStrategy(
            opts,
            async (
                jwt_payload: { id: string; username: string; iat: number; exp: number },
                done
            ) => {
                try {
                    const authService = new AuthService();
                    const user = await authService.validateUserById(jwt_payload.id);

                    if (user) {
                        const {
                            password,
                            verificationToken,
                            passwordResetToken,
                            passwordResetExpires,
                            ...safeUser
                        } = user;
                        return done(
                            null,
                            safeUser as Omit<
                                User,
                                'password' | 'verificationToken' | 'passwordResetToken' | 'passwordResetExpires'
                            >
                        );
                    } else {
                        return done(null, false);
                    }
                } catch (error) {
                    return done(error, false);
                }
            }
        )
    );
};