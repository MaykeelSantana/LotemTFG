import React, { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';
import ChangePasswordForm from '../components/ui/profile/ChangePasswordForm';

const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p className="text-xl animate-pulse">Cargando perfil o no estás autenticado...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-10 rounded-3xl shadow-2xl border border-slate-600 text-white relative"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute right-6 top-6 bg-teal-500 text-black text-xs font-bold py-1 px-3 rounded-full shadow-md">
          {user.isVerified ? 'VERIFICADO' : 'NO VERIFICADO'}
        </div>
        <h2 className="text-3xl font-bold text-white-400 mb-6">Tarjeta de Usuario</h2>
        <div className="space-y-4 text-lg">
          <p><span className="text-slate-400">Nombre de Usuario:</span> {user.username}</p>
          <p><span className="text-slate-400">Email:</span> {user.email}</p>
          <p><span className="text-slate-400">Miembro desde:</span> {new Date(user.createdAt).toLocaleDateString('es-ES')}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="mt-8 w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 rounded-xl text-lg font-semibold transition"
        >
          Cambiar Contraseña
        </button>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-600 text-white"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h3 className="text-xl font-semibold text-teal-400 mb-6">Cambiar Contraseña</h3>
              <ChangePasswordForm onClose={() => setShowModal(false)} />
              <button
                onClick={() => setShowModal(false)}
                className="mt-6 w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-md text-white"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
