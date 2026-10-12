import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { INSTITUTIONS } from '../lib/supabase';

type Institution = 'UCV' | 'SENATI';
type Shift = 'morning' | 'afternoon';

export function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    institution: 'UCV' as Institution,
    cycle_or_semester: '',
    shift: 'morning' as Shift,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'full_name':
        if (!value.trim()) return 'El nombre completo es obligatorio';
        if (value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
        return '';
      case 'email':
        if (!value) return 'El correo es obligatorio';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Correo inválido';
        return '';
      case 'password':
        if (!value) return 'La contraseña es obligatoria';
        if (value.length < 8) return 'Mínimo 8 caracteres';
        return '';
      case 'confirmPassword':
        if (value !== formData.password) return 'Las contraseñas no coinciden';
        return '';
      case 'cycle_or_semester':
        if (!value) return 'Selecciona tu ciclo/semestre';
        const num = parseInt(value, 10);
        if (formData.institution === 'UCV' && (num < 1 || num > 10)) return 'Ciclo debe ser 1-10';
        if (formData.institution === 'SENATI' && (num < 1 || num > 6)) return 'Semestre debe ser 1-6';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleInstitutionChange = (value: string) => {
    setFormData(prev => ({ ...prev, institution: value as Institution, cycle_or_semester: '' }));
    setErrors(prev => ({ ...prev, cycle_or_semester: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar todos los campos
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) newErrors[key] = error;
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setSuccess('');

    const { error } = await signUp(formData.email, formData.password, {
      full_name: formData.full_name.trim(),
      institution: formData.institution,
      cycle_or_semester: parseInt(formData.cycle_or_semester, 10),
      shift: formData.shift,
    });

    if (error) {
      setErrors({ form: error.message });
    } else {
      setSuccess('¡Cuenta creada! Verifica tu correo y luego inicia sesión.');
      setTimeout(() => navigate('/login'), 2000);
    }
    
    setLoading(false);
  };

  const cycleOptions = formData.institution === 'UCV'
    ? INSTITUTIONS.UCV.cycles.map(c => ({ value: c.toString(), label: `Ciclo ${c}` }))
    : INSTITUTIONS.SENATI.semesters.map(s => ({ value: s.toString(), label: `Semestre ${s}` }));

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link to="/" className="inline-flex items-center gap-2 mb-6" aria-label="Inicio">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-800">
            <span className="text-2xl font-bold text-white">JP</span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
        <p className="mt-2 text-gray-600">Regístrate como practicante para registrar tu asistencia</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Practicante</CardTitle>
          <CardDescription>Completa tus datos para crear tu cuenta</CardDescription>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {errors.form && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm" role="status">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <Input
              label="Nombre completo"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Juan Pérez García"
              autoComplete="name"
              required
              disabled={loading}
              error={errors.full_name}
            />

            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              required
              disabled={loading}
              error={errors.email}
            />

            <div className="relative">
              <Input
                label="Contraseña"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                disabled={loading}
                error={errors.password}
                helperText="Mínimo 8 caracteres"
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

            <Input
              label="Confirmar contraseña"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              disabled={loading}
              error={errors.confirmPassword}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Institución"
                name="institution"
                value={formData.institution}
                onChange={(e) => handleInstitutionChange(e.target.value)}
                options={[
                  { value: 'UCV', label: 'UCV - Universidad César Vallejo' },
                  { value: 'SENATI', label: 'SENATI' },
                ]}
                error={errors.institution}
                disabled={loading}
              />

              <Select
                label={formData.institution === 'UCV' ? 'Ciclo' : 'Semestre'}
                name="cycle_or_semester"
                value={formData.cycle_or_semester}
                onChange={handleChange}
                options={cycleOptions}
                placeholder="Seleccionar"
                error={errors.cycle_or_semester}
                disabled={loading}
              />
            </div>

            <fieldset className="space-y-3" disabled={loading}>
              <legend className="label-field">Turno de práctica</legend>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'morning', label: 'Mañana', time: '08:00 - 08:15', icon: '☀️' },
                  { value: 'afternoon', label: 'Tarde', time: '12:00 - 12:30', icon: '🌤️' },
                ].map(({ value, label, time, icon }) => (
                  <label
                    key={value}
                    className={cn(
                      'relative cursor-pointer',
                      formData.shift === value
                        ? 'ring-2 ring-primary-500'
                        : ''
                    )}
                  >
                    <input
                      type="radio"
                      name="shift"
                      value={value}
                      checked={formData.shift === value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className={cn(
                      'p-4 rounded-lg border-2 transition-all',
                      formData.shift === value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{icon}</span>
                        <span className="font-medium text-gray-900">{label}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 font-mono">{time}</p>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Crear cuenta
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary-800 font-medium hover:text-primary-900">
                Inicia sesión
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}