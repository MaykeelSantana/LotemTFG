import React, { useEffect, Suspense, lazy, type JSX } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import ErrorBoundary from './pages/ErrorBoundary';
import GameNewsPage from './pages/GameNewsPage';
import SocialFeedPage from './pages/SocialFeedPage';
import NavbarMenu from './components/ui/Navbar/NavbarMenu';
import AdminDashboardPage from './pages/AdminUserManagementPage';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuthStore();
    if (isLoading) {
        return <div className="text-white text-center p-10">Cargando autenticación...</div>;
    }
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    const { hydrateAuth, isAuthenticated, logout, user } = useAuthStore();
    useEffect(() => {
        hydrateAuth();
    }, [hydrateAuth]);
    return (
        <BrowserRouter>
            <div className="app-container bg-background min-h-screen text-foreground dark">
                <NavbarMenu />
                <main className="p-0 md:p-4"> 
                    <Suspense fallback={<div className="text-center p-10">Cargando página...</div>}>
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/login" element={<AuthPage />} />
                            <Route path="/register" element={<AuthPage />} />
                            <Route path="/news" element={<GameNewsPage />} />
                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute>
                                        <ProfilePage />
                                    </ProtectedRoute>
                                }
                            />
                             <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute>
                                        <AdminDashboardPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/game"
                                element={
                                    <ProtectedRoute>
                                        <ErrorBoundary>
                                            <GamePage />
                                        </ErrorBoundary>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/twt"
                                element={
                                    <ProtectedRoute>
                                            <SocialFeedPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/game/:roomId"
                                element={
                                    <ProtectedRoute>
                                        <ErrorBoundary>
                                            <GamePage />
                                        </ErrorBoundary>
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </Suspense>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;