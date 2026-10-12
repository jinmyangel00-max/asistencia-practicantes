import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess('¡Bienvenido! Redirigiendo...');
      setTimeout(() => navigate('/dashboard'), 1000);
    }
    
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link to="/" className="inline-flex items-center gap-2 mb-6" aria-label="Inicio">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-800">
            <span className="text-2xl font-bold text-white">JP</span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
        <p className="mt-2 text-gray-600">Accede a tu cuenta para registrar tu asistencia</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acceso Practicante</CardTitle>
          <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm" role="status">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              required
              disabled={loading}
              icon={<Mail className="h-5 w-5 text-gray-400" />}
            />

            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
                icon={<Lock className="h-5 w-5 text-gray-400" />}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-800 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">Recordarme</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-800 hover:text-primary-900 font-medium">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Iniciar sesión
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-primary-800 font-medium hover:text-primary-900">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Info horarios */}
      <div className="mt-6 p-4 rounded-lg bg-primary-50 border border-primary-100">
        <h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
          <span className="text-gold-500">⏰</span>
          Horarios de registro
        </h3>
        <dl className="mt-2 text-sm text-primary-700 space-y-1">
          <div className="flex justify-between">
            <dt>Turno Mañana:</dt>
            <dd className="font-mono font-medium">08:00 - 08:15</dd>
          </div>
          <div className="flex justify-between">
            <dt>Turno Tarde:</dt>
            <dd className="font-mono font-medium">12:00 - 12:30</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}