import { useState } from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  const [currentYear] = useState(() => new Date().getFullYear());

  return (
    <footer className="bg-primary-950 text-white border-t border-primary-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2" aria-label="Inicio">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-800">
                <span className="text-lg font-bold text-white">JP</span>
              </div>
              <span className="font-bold text-xl">
                Asistencia <span className="text-gold-400">Practicantes</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-gray-400 max-w-xs">
              Sistema de control de asistencia para practicantes de UCV y SENATI en la I.E.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Enlaces</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Mi Asistencia
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Iniciar Sesión
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Registrarse
                </Link>
              </li>
            </ul>
          </div>

          {/* Horarios */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Horarios de Registro</h3>
            <dl className="mt-4 space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <dt>Turno Mañana</dt>
                <dd className="font-mono text-white">08:00 - 08:15</dd>
              </div>
              <div className="flex justify-between">
                <dt>Turno Tarde</dt>
                <dd className="font-mono text-white">12:00 - 12:30</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-8 border-t border-primary-800 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-400">
              © {currentYear} JP - Sistema de Asistencia. Todos los derechos reservados.
            </p>
            <p className="text-xs text-gray-500">
              Desarrollado para la I.E. - Institución Educativa
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}