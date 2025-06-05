import React, { useState } from 'react';
import { authService } from '../../../services/auth.service';

interface ChangePasswordFormProps {
    onClose: () => void;
}

/**
 * Formulario para cambiar la contraseña del usuario.
 * Permite ingresar la contraseña actual, la nueva contraseña y su confirmación.
 * Realiza validaciones básicas en el frontend y muestra mensajes de error o éxito.
 *
 * @component
 * @param {ChangePasswordFormProps} props - Propiedades del componente.
 * @returns {JSX.Element} El formulario de cambio de contraseña.
 */
const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onClose }) => {
        const [currentPassword, setCurrentPassword] = useState('');
        const [newPassword, setNewPassword] = useState('');
        const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
        const [isLoading, setIsLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [successMessage, setSuccessMessage] = useState<string | null>(null);

        const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                setError(null);
                setSuccessMessage(null);

                if (newPassword !== newPasswordConfirm) {
                        setError('Las nuevas contraseñas no coinciden.');
                        return;
                }
                if (newPassword.length < 8) {
                        setError('La nueva contraseña debe tener al menos 8 caracteres.');
                        return;
                }

                setIsLoading(true);
                try {
                        const response = await authService.changePassword({
                                currentPassword,
                                newPassword,
                                newPasswordConfirm,
                        });
                        setSuccessMessage(response.message || 'Contraseña actualizada correctamente.');
                        setCurrentPassword('');
                        setNewPassword('');
                        setNewPasswordConfirm('');
                } catch (err: any) {
                        console.error("Error al cambiar contraseña:", err);
                        if (err.response && err.response?.data?.message) {
                                if (Array.isArray(err.response.data.errors)) {
                                        const messages = err.response.data.errors.map((e: any) => 
                                                Object.values(e.constraints || {}).join(', ')
                                        ).join('; ');
                                        setError(`Error de validación: ${messages}`);
                                } else {
                                        setError(err.response.data.message);
                                }
                        } else if (err.message) {
                                setError(err.message);
                        } else {
                                setError('Ocurrió un error desconocido al cambiar la contraseña.');
                        }
                } finally {
                        setIsLoading(false);
                }
        };

        return (
                <div className="w-full max-w-md p-6 bg-slate-700 rounded-lg shadow-xl">
                        <h2 className="text-2xl font-semibold mb-6 text-center text-teal-300">Cambiar Contraseña</h2>
                        
                        {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</p>}
                        {successMessage && <p className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{successMessage}</p>}

                        <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                        <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-300">
                                                Contraseña Actual
                                        </label>
                                        <input
                                                id="currentPassword"
                                                name="currentPassword"
                                                type="password"
                                                autoComplete="current-password"
                                                required
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                                disabled={isLoading}
                                        />
                                </div>

                                <div>
                                        <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300">
                                                Nueva Contraseña
                                        </label>
                                        <input
                                                id="newPassword"
                                                name="newPassword"
                                                type="password"
                                                autoComplete="new-password"
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                                disabled={isLoading}
                                        />
                                         <p className="mt-1 text-xs text-slate-400">Mínimo 8 caracteres, con mayúsculas, minúsculas y números/símbolos.</p>
                                </div>

                                <div>
                                        <label htmlFor="newPasswordConfirm" className="block text-sm font-medium text-slate-300">
                                                Confirmar Nueva Contraseña
                                        </label>
                                        <input
                                                id="newPasswordConfirm"
                                                name="newPasswordConfirm"
                                                type="password"
                                                autoComplete="new-password"
                                                required
                                                value={newPasswordConfirm}
                                                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                                disabled={isLoading}
                                        />
                                </div>

                                <div>
                                        <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-500 disabled:opacity-50"
                                        >
                                                {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
                                        </button>
                                </div>
                        </form>
                </div>
        );
};

export default ChangePasswordForm;
