import { Router, Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { jwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './entities/User.entity';
import { ChangePasswordDto } from './dto/change-password.dto';

/**
 * Extiende la interfaz Request de Express para incluir la propiedad user,
 * que representa al usuario autenticado (sin campos sensibles).
 */
interface AuthenticatedRequest extends Request {
    user?: Omit<User, 'password' | 'verificationToken' | 'passwordResetToken' | 'passwordResetExpires'>;
}

/**
 * Controlador de autenticación.
 * Gestiona el registro, login, cambio de contraseña y obtención del perfil de usuario.
 */
export class AuthController {
    public router: Router;
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
        this.router = Router();
        this.initializeRoutes();
    }

    /**
     * Inicializa las rutas de autenticación y las asocia con sus métodos correspondientes.
     */
    private initializeRoutes(): void {
        this.router.post('/register', this.register.bind(this));
        this.router.post('/login', this.login.bind(this));
        this.router.post('/me/change-password', jwtAuthGuard, this.changePassword.bind(this));
        this.router.get('/profile', jwtAuthGuard, this.getProfile.bind(this));
    }

    /**
     * Registra un nuevo usuario.
     * @route POST /register
     * @param req - Request con los datos de registro (username, email, password)
     * @param res - Response con el resultado del registro
     */
    async register(req: Request, res: Response, next: NextFunction): Promise<void> { 
        try {
            const registerUserDto: RegisterUserDto = req.body;
            if (!registerUserDto.username || !registerUserDto.email || !registerUserDto.password) {
                res.status(400).json({ message: "Todos los campos son requeridos: username, email, password." });
                return;
            }
            const user = await this.authService.register(registerUserDto);
            res.status(201).json({ message: "Usuario registrado exitosamente.", user });
        } catch (error: any) {
            if (error.message.includes("ya está en uso")) {
                res.status(409).json({ message: error.message }); 
            } else {
                console.error(`[AuthController] Error en register: ${error.message}`, error.stack);
                res.status(500).json({ message: "Error interno del servidor al registrar el usuario." });
            }
        }
    }

    /**
     * Inicia sesión de un usuario.
     * @route POST /login
     * @param req - Request con email/username y password
     * @param res - Response con el usuario autenticado y el token JWT
     */
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const loginUserDto: LoginUserDto = req.body;
            if (!loginUserDto.emailOrUsername || !loginUserDto.password) {
                res.status(400).json({ message: "Email/username y password son requeridos." });
                return;
            }
            const { user, token } = await this.authService.login(loginUserDto);
            res.status(200).json({ 
                message: "Login exitoso.", 
                user, 
                token,
                expiresIn: process.env.JWT_EXPIRES_IN
            });
        } catch (error: any) {
            if (error.message.includes("Credenciales inválidas")) {
                res.status(401).json({ message: error.message });
            } else if (error.message.includes("El secreto JWT no está configurado")) {
                console.error(`[AuthController] Error en login: ${error.message}`);
                res.status(500).json({ message: "Error de configuración del servidor." });
            } else {
                console.error(`[AuthController] Error en login: ${error.message}`, error.stack);
                res.status(500).json({ message: "Error interno del servidor durante el login." });
            }
        }
    }

    /**
     * Permite al usuario autenticado cambiar su contraseña.
     * @route POST /me/change-password
     * @middleware jwtAuthGuard
     * @param req - Request con el DTO de cambio de contraseña y usuario autenticado
     * @param res - Response con el resultado del cambio
     */
    async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const changePasswordDto = plainToInstance(ChangePasswordDto, req.body);
            const errors = await validate(changePasswordDto);

            if (errors.length > 0) {
                const formattedErrors = errors.map(err => ({
                    property: err.property,
                    constraints: err.constraints
                }));
                res.status(400).json({ message: 'Error de validación', errors: formattedErrors });
                return;
            }

            const userId = (req.user as User).id;
            if (!userId) {
                res.status(401).json({ message: 'Usuario no autenticado.' });
                return;
            }

            const result = await this.authService.changePassword(userId, changePasswordDto);
            res.status(200).json(result);
        } catch (error: any) {
            console.error("[AuthController] ChangePassword Error:", error.message);
            const statusCode = error.name === "CustomBadRequestException" ? 400 : 
                               error.name === "CustomNotFoundException" ? 404 : 500;
            res.status(statusCode).json({ message: error.message || 'Error interno del servidor al cambiar la contraseña.' });
        }
    }

    /**
     * Obtiene el perfil del usuario autenticado.
     * @route GET /profile
     * @middleware jwtAuthGuard
     * @param req - Request con el usuario autenticado
     * @param res - Response con los datos del usuario
     */
    async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        const authReq = req as AuthenticatedRequest;
        if (authReq.user) {
            res.status(200).json({ message: "Perfil del usuario obtenido.", user: authReq.user });
        } else {
            res.status(401).json({ message: "No se pudo obtener el perfil del usuario." });
        }
    }
}