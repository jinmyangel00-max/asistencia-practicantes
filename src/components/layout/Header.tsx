import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LogOut, Menu, X, User, Shield } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

export function Header() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = isAdmin
    ? [{ path: '/admin', label: 'Panel Admin', icon: Shield }]
    : [{ path: '/dashboard', label: 'Mi Asistencia', icon: User }];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Navegación principal">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2" aria-label="Inicio">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-800">
              <span className="text-lg font-bold text-white">JP</span>
            </div>
            <span className="hidden font-bold text-xl text-primary-800 sm:block">
              Asistencia <span className="text-gold-500">Practicantes</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-6">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-primary-800'
                      : 'text-gray-600 hover:text-primary-800'
                  )
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>

          {/* User Menu / Auth Buttons */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                {profile && <div className="hidden sm:flex sm:items-center sm:gap-2">
                  {profile.shift && <Badge variant={profile.shift === 'morning' ? 'morning' : 'afternoon'}>
                    {profile.shift === 'morning' ? 'Mañana' : 'Tarde'}
                  </Badge>}
                  <span className="text-sm font-medium text-gray-700">
                    {profile?.full_name}
                  </span>
                </div>}
                <Button variant="ghost" size="sm" onClick={signOut} aria-label="Cerrar sesión">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Salir</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Iniciar sesión</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Crear cuenta</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t border-gray-200 animate-slide-in">
            <div className="flex flex-col gap-2">
              {navLinks.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-800'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-primary-800'
                    )
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
              {user ? (
                <Button variant="outline" onClick={() => { signOut(); setMobileMenuOpen(false); }} className="mt-2">
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar sesión
                </Button>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Iniciar sesión</Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Crear cuenta</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
