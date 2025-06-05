import { useAuthStore } from "../store/auth.store";

/**
 * Representa un usuario autenticado.
 */
export interface User {
    id: string;
    username: string;
    email: string;
    currencyBalance?: number;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
    role: UserRoleClient;
}

/**
 * Respuesta estándar de autenticación.
 */
export interface AuthResponse {
    message: string;
    user: User;
    token?: string;
    expiresIn?: string;
}

/**
 * Datos requeridos para el registro de usuario.
 */
export interface RegisterData {
    username: string;
    email: string;
    password: string;
}

/**
 * Datos requeridos para el inicio de sesión.
 */
export interface LoginData {
    emailOrUsername: string;
    password: string;
}

/**
 * Roles posibles para el usuario.
 */
export enum UserRoleClient {
    USER = 'user',
    EDITOR = 'editor',
    ADMIN = 'admin',
}

/**
 * Datos requeridos para cambiar la contraseña.
 */
interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirm: string;
}

/**
 * Respuesta al cambiar la contraseña.
 */
interface ChangePasswordResponse {
    message: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Maneja la respuesta HTTP, lanzando errores si corresponde.
 * @param response Respuesta HTTP a procesar.
 * @returns Promesa con los datos procesados.
 */
async function handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    if (!response.ok) {
        let errorData: any = { message: `Error HTTP: ${response.status}` };
        if (contentType && contentType.includes("application/json")) {
            try {
                errorData = await response.json();
            } catch {}
        }
        throw new Error(errorData.message || response.statusText);
    }
    if (contentType && contentType.includes("application/json")) {
        return response.json() as Promise<T>;
    }
    throw new Error("La respuesta no es JSON como se esperaba.");
}

/**
 * Servicio de autenticación para registro, login, perfil y cambio de contraseña.
 */
export const authService = {
    /**
     * Registra un nuevo usuario.
     * @param data Datos de registro.
     * @returns Respuesta de autenticación.
     */
    register: async (data: RegisterData): Promise<AuthResponse> => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return handleResponse<AuthResponse>(response);
    },

    /**
     * Inicia sesión de usuario.
     * @param data Datos de inicio de sesión.
     * @returns Respuesta de autenticación.
     */
    login: async (data: LoginData): Promise<AuthResponse> => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return handleResponse<AuthResponse>(response);
    },

    /**
     * Obtiene el perfil del usuario autenticado.
     * @param token Token JWT de autenticación.
     * @returns Objeto con los datos del usuario.
     */
    getProfile: async (token: string): Promise<{ user: User }> => {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        return handleResponse<{ message: string, user: User }>(response);
    },

    /**
     * Cambia la contraseña del usuario autenticado.
     * @param data Datos para el cambio de contraseña.
     * @returns Respuesta con mensaje de éxito o error.
     */
    changePassword: async (data: ChangePasswordData): Promise<ChangePasswordResponse> => {
        const token = useAuthStore.getState().token;
        if (!token) {
            return Promise.reject(new Error("Usuario no autenticado. No se puede cambiar la contraseña."));
        }
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            return handleResponse<ChangePasswordResponse>(response);
        } catch (error: any) {
            console.error("Error en AuthService.changePassword:", error.message);
            throw error;
        }
    }
};
