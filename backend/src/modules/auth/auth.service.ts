import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AppDataSource from '../../config/data-source';
import { User } from './entities/User.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

/**
 * Excepción personalizada para errores de autorización.
 */
class CustomUnauthorizedException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CustomUnauthorizedException";
    }
}

/**
 * Excepción personalizada para errores de solicitud incorrecta.
 */
class CustomBadRequestException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CustomBadRequestException";
    }
}

/**
 * Excepción personalizada para errores de recurso no encontrado.
 */
class CustomNotFoundException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CustomNotFoundException";
    }
}

/**
 * Servicio de autenticación para gestión de usuarios, registro, login y cambio de contraseña.
 */
export class AuthService {
    private userRepository: Repository<User>;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
    }

    /**
     * Registra un nuevo usuario en la base de datos.
     * @param registerUserDto Datos de registro del usuario.
     * @returns Usuario registrado sin campos sensibles.
     * @throws Error si el nombre de usuario o email ya están en uso.
     */
    async register(
        registerUserDto: RegisterUserDto
    ): Promise<Omit<User, 'password' | 'verificationToken' | 'passwordResetToken' | 'passwordResetExpires'>> {
        const { username, email, password } = registerUserDto;

        const existingUserByUsername = await this.userRepository.findOneBy({ username });
        if (existingUserByUsername) {
            throw new Error('El nombre de usuario ya está en uso.');
        }
        const existingUserByEmail = await this.userRepository.findOneBy({ email });
        if (existingUserByEmail) {
            throw new Error('El email ya está en uso.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = this.userRepository.create({
            username,
            email,
            password: hashedPassword,
        });

        await this.userRepository.save(newUser);

        const { password: _p, verificationToken: _vt, passwordResetExpires: _pre, passwordResetToken: _prt, ...userWithoutSensitiveData } = newUser;
        return userWithoutSensitiveData;
    }

    /**
     * Autentica a un usuario y genera un token JWT.
     * @param loginUserDto Datos de inicio de sesión (usuario/email y contraseña).
     * @returns Objeto con usuario autenticado (sin datos sensibles) y token JWT.
     * @throws Error si las credenciales son inválidas o hay error de configuración.
     */
    async login(
        loginUserDto: LoginUserDto
    ): Promise<{
        user: Omit<User, 'password' | 'verificationToken' | 'passwordResetToken' | 'passwordResetExpires'>,
        token: string
    }> {
        const { emailOrUsername, password } = loginUserDto;

        let user = await this.userRepository.findOne({
            where: [{ email: emailOrUsername }, { username: emailOrUsername }],
        });

        if (!user) {
            throw new Error('Credenciales inválidas (usuario no encontrado).');
        }

        const isPasswordMatching = await bcrypt.compare(password, user.password);
        if (!isPasswordMatching) {
            throw new Error('Credenciales inválidas (contraseña incorrecta).');
        }

        const payload = {
            id: user.id,
            username: user.username,
        };

        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpiresIn = process.env.JWT_EXPIRES_IN;

        if (!jwtSecret) {
            console.error("FATAL ERROR: JWT_SECRET no está definido.");
            throw new Error('Error de configuración del servidor: El secreto JWT no está configurado.');
        }

        const signOptions: jwt.SignOptions = {};
        if (jwtExpiresIn) {
            signOptions.expiresIn = '1d';
        }

        const token = jwt.sign(payload, jwtSecret, signOptions);

        const { password: _p, verificationToken: _vt, passwordResetExpires: _pre, passwordResetToken: _prt, ...userWithoutSensitiveData } = user;
        return { user: userWithoutSensitiveData, token };
    }

    /**
     * Valida la existencia de un usuario por su ID.
     * @param userId ID del usuario.
     * @returns Usuario si existe, null en caso contrario.
     */
    async validateUserById(userId: string): Promise<User | null> {
        return this.userRepository.findOneBy({ id: userId });
    }

    /**
     * Cambia la contraseña de un usuario autenticado.
     * @param userId ID del usuario.
     * @param changePasswordDto Datos para el cambio de contraseña.
     * @returns Mensaje de éxito.
     * @throws CustomNotFoundException si el usuario no existe.
     * @throws CustomBadRequestException si la contraseña actual es incorrecta.
     * @throws Error en caso de fallo interno al guardar.
     */
    async changePassword(
        userId: string,
        changePasswordDto: ChangePasswordDto
    ): Promise<{ message: string }> {
        const { currentPassword, newPassword } = changePasswordDto;

        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new CustomNotFoundException('Usuario no encontrado.');
        }

        const isPasswordMatching = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordMatching) {
            throw new CustomBadRequestException('La contraseña actual es incorrecta.');
        }

        user.password = await bcrypt.hash(newPassword, 10);

        try {
            await this.userRepository.save(user);
            return { message: 'Contraseña actualizada correctamente.' };
        } catch (error) {
            console.error("Error al actualizar la contraseña:", error);
            throw new Error('Error interno del servidor al cambiar la contraseña.');
        }
    }
}
