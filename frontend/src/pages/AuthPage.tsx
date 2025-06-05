// src/pages/AuthPage.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/auth.store';
import { useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', password: '', emailOrUsername: '' });

  const { login, register, isLoading, error, isAuthenticated, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/');
    return () => clearError();
  }, [isAuthenticated, navigate, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (isLogin) {
        await login({ emailOrUsername: form.emailOrUsername, password: form.password });
      } else {
        await register({ username: form.username, email: form.email, password: form.password });
        alert("¡Registro exitoso! Por favor, inicia sesión.");
        setIsLogin(true);
      }
    } catch (err: any) {
      console.error("Auth error:", err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <motion.div 
        className="w-full max-w-md p-6 rounded-xl bg-gray-800 shadow-2xl"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold mb-4 text-center text-white-400">
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>

        <div className="flex justify-center mb-4">
          <button
            className={`px-4 py-2 rounded-l-full text-sm font-semibold ${isLogin ? 'bg-teal-500' : 'bg-gray-700'} transition`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`px-4 py-2 rounded-r-full text-sm font-semibold ${!isLogin ? 'bg-teal-500' : 'bg-gray-700'} transition`}
            onClick={() => setIsLogin(false)}
          >
            Registro
          </button>
        </div>

        {error && <p className="text-red-400 bg-red-900 p-3 rounded-md text-sm mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                key="username"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            key={isLogin ? 'emailOrUsername' : 'email'}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3 }}
          >
            <label className="block text-sm mb-1">{isLogin ? 'Email o Usuario' : 'Email'}</label>
            <input
              type="text"
              value={isLogin ? form.emailOrUsername : form.email}
              onChange={(e) => setForm({ ...form, [isLogin ? 'emailOrUsername' : 'email']: e.target.value })}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </motion.div>

          <motion.div
            key="password"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3 }}
          >
            <label className="block text-sm mb-1">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </motion.div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 mt-2 rounded bg-black hover:bg-white hover:text-black transition font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? (isLogin ? 'Iniciando...' : 'Registrando...') : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AuthPage;
