import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { useAuthStore } from "../../../store/auth.store";
import { cn } from "../../../lib/utils";

/**
 * NavbarMenu es un componente de barra de navegación responsiva para la aplicación.
 * 
 * - Muestra enlaces de navegación para las secciones principales (Inicio, Noticias, Social, Jugar).
 * - Muestra controles de autenticación de usuario: perfil y cerrar sesión para usuarios autenticados,
 *   y opciones de iniciar sesión/registrarse para invitados.
 * - Adapta el diseño para pantallas móviles y de escritorio, proporcionando un menú desplegable en móviles.
 * - Utiliza `useAuthStore` para el estado de autenticación e información del usuario.
 * - Emplea componentes de shadcn/ui para menús desplegables y botones.
 *
 * @component
 * @returns {JSX.Element} El componente NavbarMenu renderizado.
 */

const NavbarMenu: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: "/", label: "Inicio" },
    { to: "/news", label: "Noticias" },
    { to: "/twt", label: "Social" },
    { to: "/game", label: "Jugar" },
  ];

  return (
    <header className="w-full backdrop-blur bg-background/70 border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-primary hover:text-primary/80"
        >
          <img src="/assets/c_images/LOTEM.png" style={{ width: "50%" }} />
        </Link>

        <nav className="hidden sm:flex items-center gap-2 bg-muted/40 p-1 rounded-lg">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden sm:block">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">👤 {user?.username}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link to="/profile">Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>Cerrar sesión</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex space-x-4 text-sm">
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-medium transition-colors rounded-md bg-black border border-white text-white hover:bg-blue-600"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center px-4 py-2 text-sm font-medium transition-colors rounded-md bg-black border border-blue-500 text-white hover:bg-blue-600"
              >
                Registrate
              </Link>
            </div>
          )}
        </div>

        <button
          className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
          aria-label="Toggle menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            {mobileMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {mobileMenuOpen && (
        <nav className="sm:hidden bg-background/90 backdrop-blur border-t border-border px-4 py-4">
          <div className="flex flex-col space-y-2">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "block px-4 py-2 rounded-md text-base font-medium transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )
                }
                onClick={() => setMobileMenuOpen(false)} 
              >
                {label}
              </NavLink>
            ))}

            <hr className="my-2 border-border" />

            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="block px-4 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Perfil
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Registro
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default NavbarMenu;
