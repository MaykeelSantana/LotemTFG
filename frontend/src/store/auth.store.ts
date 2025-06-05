/**
 * auth.store.ts
 * 
 * Estado global de autenticación usando Zustand.
 * Gestiona el usuario autenticado, token, estado de carga, errores y saldo de moneda.
 * Provee acciones para login, registro, logout, hidratación y actualización de saldo.
 */

import { create } from 'zustand';
import { authService as httpAuthService, type User, type LoginData, type RegisterData } from '../services/auth.service';
import { socketService } from '../services/socket.service';

const TOKEN_STORAGE_KEY = 'lotem_auth_token';

/**
 * Estado y acciones del store de autenticación.
 */
interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    currencyBalance: number | null;
    login: (credentials: LoginData) => Promise<boolean>;
    register: (userData: RegisterData) => Promise<boolean>;
    logout: () => void;
    hydrateAuth: () => Promise<void>;
    clearError: () => void;
    updateCurrencyBalance: (newBalance: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    currencyBalance: null,

    /**
     * Inicia sesión con las credenciales proporcionadas.
     * Actualiza el usuario, token y saldo si es exitoso.
     */
    login: async (credentials: LoginData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await httpAuthService.login(credentials);
            if (response.token && response.user) {
                set({
                    user: response.user,
                    token: response.token,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                    currencyBalance: response.user.currencyBalance ?? null,
                });
                localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
                socketService.updateTokenAndReconnect();
                return true;
            } else {
                throw new Error(response.message || "Respuesta de login inválida del servidor.");
            }
        } catch (error: any) {
            const errorMessage = error.message || "Error desconocido durante el login.";
            set({
                isLoading: false,
                error: errorMessage,
                isAuthenticated: false,
                user: null,
                token: null,
                currencyBalance: null,
            });
            if (socketService.socket?.connected) {
                socketService.disconnect();
            }
            return false;
        }
    },

    /**
     * Registra un nuevo usuario.
     */
    register: async (userData: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
            await httpAuthService.register(userData);
            set({ isLoading: false, error: null });
            return true;
        } catch (error: any) {
            const errorMessage = error.message || "Error desconocido durante el registro.";
            set({ isLoading: false, error: errorMessage });
            return false;
        }
    },

    /**
     * Cierra la sesión y limpia el estado.
     */
    logout: () => {
        set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
            isLoading: false,
            currencyBalance: null,
        });
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        if (socketService.socket?.connected) {
            socketService.disconnect();
        }
        socketService.socket = null;
    },

    /**
     * Hidrata el estado de autenticación desde el token almacenado.
     * Valida el token y recupera el perfil del usuario.
     */
    hydrateAuth: async () => {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (token) {
            set({ isLoading: true, token: token, isAuthenticated: false });
            try {
                const profileResponse = await httpAuthService.getProfile(token);
                if (profileResponse.user) {
                    set({
                        user: profileResponse.user,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                        currencyBalance: profileResponse.user.currencyBalance ?? null,
                    });
                    socketService.connect();
                } else {
                    get().logout();
                }
            } catch (error: any) {
                get().logout();
            }
        } else {
            set({
                isLoading: false,
                isAuthenticated: false,
                user: null,
                token: null,
                currencyBalance: null,
            });
            if (socketService.socket?.connected) {
                socketService.disconnect();
                socketService.socket = null;
            }
        }
    },

    /**
     * Limpia el mensaje de error actual.
     */
    clearError: () => {
        set({ error: null });
    },

    /**
     * Actualiza el saldo de moneda del usuario autenticado.
     * Modifica tanto el estado global como la propiedad currencyBalance del usuario.
     */
    updateCurrencyBalance: (newBalance: number) => {
        set((state) => {
            if (state.user) {
                return {
                    ...state,
                    currencyBalance: newBalance,
                    user: {
                        ...state.user,
                        currencyBalance: newBalance,
                    },
                };
            }
            return state;
        });
    },
}));
