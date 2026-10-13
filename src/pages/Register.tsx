import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { AlertCircle, CheckCircle, Eye, EyeOff, Mail, Lock, User, Shield, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { INSTITUTIONS } from '../lib/supabase';

type Institution = 'UCV' | 'SENATI';
type Shift = 'morning' | 'afternoon';
type AccountRole = 'practicante' | 'admin';

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const MotionButton = motion.create(Button);

export function Register() {
  const { signUp, resendSignupConfirmation } = useAuth();
  const [accountRole, setAccountRole] = useState<AccountRole>('practicante');
  const [adminRegistrationCode, setAdminRegistrationCode] = useState('');
  
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
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [step, setStep] = useState<'form' | 'check-email' | 'success'>('form');

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
        if (!/[A-Z]/.test(value)) return 'Debe tener al menos una mayúscula';
        if (!/[0-9]/.test(value)) return 'Debe tener al menos un número';
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

  const handleResendConfirmation = async () => {
    setResending(true);
    setResendMessage('');
    const { error } = await resendSignupConfirmation(formData.email.trim().toLowerCase());
    setResending(false);
    setResendMessage(error
      ? error.message
      : 'Solicitud procesada. Revisa también spam; la entrega depende de la configuración de correo de Supabase.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach(key => {
      if (accountRole === 'admin' && ['institution', 'cycle_or_semester', 'shift'].includes(key)) return;
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) newErrors[key] = error;
    });
    if (accountRole === 'admin' && !adminRegistrationCode.trim()) {
      newErrors.adminRegistrationCode = 'Ingresa el código de administrador';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const { error } = await signUp(formData.email, formData.password, {
      full_name: formData.full_name.trim(),
      role: accountRole,
      ...(accountRole === 'practicante' ? {
        institution: formData.institution,
        cycle_or_semester: parseInt(formData.cycle_or_semester, 10),
        shift: formData.shift,
      } : {}),
    }, accountRole === 'admin' ? adminRegistrationCode.trim() : undefined);

    setLoading(false);

    if (error) {
      const message = error.message === 'EMAIL_ALREADY_REGISTERED'
        ? 'Ya existe una cuenta registrada con este correo. Inicia sesión o usa otro correo.'
        : error.message === 'ADMIN_CODE_INVALID'
          ? 'El código de administrador es incorrecto.'
          : error.message === 'ADMIN_ALREADY_REGISTERED'
            ? 'Ya existe un administrador registrado. No se puede crear otro.'
            : error.message === 'ADMIN_VALIDATION_UNAVAILABLE'
              ? 'No se pudo validar el código. Ejecuta la migración de seguridad actualizada en Supabase y vuelve a intentarlo.'
            : /Database error saving new user/i.test(error.message)
              ? 'No se pudo crear la cuenta. Ejecuta la migración de seguridad actualizada en Supabase y vuelve a intentarlo.'
              : error.message;
      setErrors({ form: message });
    } else {
      setStep('check-email');
    }
  };

  const cycleOptions = formData.institution === 'UCV'
    ? INSTITUTIONS.UCV.cycles.map(c => ({ value: c.toString(), label: `Ciclo ${c}` }))
    : INSTITUTIONS.SENATI.semesters.map(s => ({ value: s.toString(), label: `Semestre ${s}` }));

  const shiftOptions = [
    { value: 'morning', label: 'Mañana', time: '08:00 - 08:15', icon: '☀️' },
    { value: 'afternoon', label: 'Tarde', time: '12:00 - 12:30', icon: '🌤️' },
  ];

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
      className="w-full max-w-md"
    >
      <motion.div 
        variants={itemVariants}
        className="text-center mb-8"
      >
        <Link to="/" className="inline-flex items-center gap-2 mb-6" aria-label="Inicio">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-800 shadow-lg shadow-primary-900/25"
          >
            <span className="text-2xl font-bold text-white">JP</span>
          </motion.div>
        </Link>
        <motion.h1 className="text-2xl font-bold text-gray-900">Crear cuenta</motion.h1>
        <motion.p className="mt-2 text-gray-600">
          {accountRole === 'admin' ? 'Crea la cuenta que administrará las asistencias' : 'Regístrate como practicante para registrar tu asistencia'}
        </motion.p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.div key="form" initial="hidden" animate="visible" exit="exit" variants={itemVariants}>
            <Card className="overflow-hidden">
              <CardHeader className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-800/5 via-transparent to-gold-500/5" />
                <CardTitle className="relative">{accountRole === 'admin' ? 'Registro de Administrador' : 'Registro de Practicante'}</CardTitle>
                <CardDescription className="relative">
                  {accountRole === 'admin' ? 'Completa tus datos de administrador' : 'Completa tus datos para crear tu cuenta'}
                </CardDescription>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {errors.form && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200"
                      role="alert"
                    >
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span>{errors.form}</span>
                    </motion.div>
                  )}

                  <motion.div variants={itemVariants}>
                    <fieldset className="space-y-2" disabled={loading}>
                      <legend className="label-field">Tipo de cuenta</legend>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          ['practicante', 'Practicante'],
                          ['admin', 'Administrador (único)'],
                        ] as const).map(([value, label]) => (
                          <label key={value} className={cn(
                            'cursor-pointer rounded-lg border p-3 text-sm transition-colors',
                            accountRole === value ? 'border-primary-500 bg-primary-50 text-primary-900' : 'border-gray-200 text-gray-700'
                          )}>
                            <input
                              type="radio"
                              name="accountRole"
                              value={value}
                              checked={accountRole === value}
                              onChange={() => setAccountRole(value)}
                              className="mr-2 accent-blue-700"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {accountRole === 'admin' && (
                      <div className="mt-3">
                        <Input
                          label="Código de registro de administrador"
                          name="adminRegistrationCode"
                          type="password"
                          value={adminRegistrationCode}
                          onChange={(e) => {
                            setAdminRegistrationCode(e.target.value);
                            setErrors(prev => ({ ...prev, adminRegistrationCode: '' }));
                          }}
                          autoComplete="off"
                          required
                          disabled={loading}
                          error={errors.adminRegistrationCode}
                        />
                        <p className="mt-1 text-xs text-gray-500">El código solo permite registrar una cuenta y se configura en Supabase.</p>
                      </div>
                    )}
                  </motion.div>

                  <motion.div variants={itemVariants}>
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
                      icon={<User className="h-5 w-5 text-gray-400" />}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
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
                      icon={<Mail className="h-5 w-5 text-gray-400" />}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
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
                        helperText="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                        icon={<Lock className="h-5 w-5 text-gray-400" />}
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        whileTap={{ scale: 0.9 }}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </motion.button>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
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
                      icon={<Lock className="h-5 w-5 text-gray-400" />}
                    />
                  </motion.div>

                  {accountRole === 'practicante' && <>
                    <motion.div variants={itemVariants}>
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
                        icon={<Shield className="h-5 w-5 text-gray-400" />}
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
                        icon={<Sparkles className="h-5 w-5 text-gray-400" />}
                      />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                    <fieldset className="space-y-3" disabled={loading}>
                      <legend className="label-field">Turno de práctica</legend>
                      <div className="grid grid-cols-2 gap-3">
                        {shiftOptions.map(({ value, label, time, icon }) => (
                          <motion.label
                            key={value}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              'relative cursor-pointer transition-all duration-300',
                              formData.shift === value
                                ? 'ring-2 ring-primary-500 scale-[1.02]'
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
                              'p-4 rounded-xl border-2 transition-all duration-300 relative overflow-hidden',
                              formData.shift === value
                                ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-500/10'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            )}>
                              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary-500/5 to-transparent opacity-0 transition-opacity" 
                                style={{ opacity: formData.shift === value ? 1 : 0 }} />
                              <div className="relative flex items-center gap-2">
                                <span className="text-2xl">{icon}</span>
                                <span className="font-medium text-gray-900">{label}</span>
                              </div>
                              <p className="mt-1 text-sm text-gray-500 font-mono">{time}</p>
                              <motion.div
                                initial={false}
                                animate={{ opacity: formData.shift === value ? 1 : 0, y: formData.shift === value ? 0 : 4 }}
                                transition={{ duration: 0.3 }}
                                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-gold-500"
                              />
                            </div>
                          </motion.label>
                        ))}
                      </div>
                    </fieldset>
                    </motion.div>
                  </>}

                  <MotionButton
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={loading}
                    disabled={loading}
                  >
                    Crear cuenta
                  </MotionButton>
                </form>

                <motion.div 
                  variants={itemVariants}
                  className="mt-6 text-center"
                >
                  <p className="text-sm text-gray-600">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="text-primary-800 font-medium hover:text-primary-900 transition-colors">
                      Inicia sesión
                    </Link>
                  </p>
                </motion.div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {step === 'check-email' && (
          <motion.div 
            key="check-email" 
            initial="hidden" 
            animate="visible" 
            exit="exit"
            variants={itemVariants}
            className="text-center"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }} 
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 mb-6"
            >
              <Mail className="h-10 w-10 text-primary-600" />
            </motion.div>
            
            <motion.h2 className="text-2xl font-bold text-gray-900 mb-3">
              ¡Revisa tu correo!
            </motion.h2>
            
            <motion.p className="text-gray-600 mb-2">
              Si la confirmación por correo está activada, debe llegar un enlace a
            </motion.p>
            
            <motion.p className="font-mono text-primary-800 font-medium mb-6">
              {formData.email}
            </motion.p>

            <motion.div className="p-4 rounded-xl bg-primary-50 border border-primary-100 mb-6 text-left">
              <p className="text-sm font-medium text-primary-800 mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Próximos pasos:
              </p>
              <ol className="text-sm text-primary-700 space-y-1">
                <li className="flex items-center gap-2"><span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">1</span>Revisa Recibidos y Spam</li>
                <li className="flex items-center gap-2"><span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">2</span>Busca el correo de <strong>JP Asistencia</strong></li>
                <li className="flex items-center gap-2"><span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">3</span>Haz clic en "Confirmar correo"</li>
                <li className="flex items-center gap-2"><span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">4</span>Regresa e inicia sesión</li>
              </ol>
            </motion.div>

            <motion.div className="flex flex-col gap-3">
              <div>
                <Button type="button" variant="outline" className="w-full" onClick={handleResendConfirmation} loading={resending}>
                  Reenviar correo de confirmación
                </Button>
                {resendMessage && <p className="mt-2 text-sm text-gray-600" role="status">{resendMessage}</p>}
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full" size="lg" iconRight={<Sparkles className="h-4 w-4" />}>
                  Ya confirmé mi correo, ir a Login
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => setStep('form')} className="w-full">
                Volver a registrar
              </Button>
            </motion.div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div 
            key="success" 
            initial="hidden" 
            animate="visible" 
            exit="exit"
            variants={itemVariants}
            className="text-center"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6"
            >
              <CheckCircle className="h-10 w-10 text-green-600" />
            </motion.div>
            
            <motion.h2 className="text-2xl font-bold text-gray-900 mb-3">
              ¡Cuenta creada exitosamente!
            </motion.h2>
            
            <motion.p className="text-gray-600 mb-6">
              Tu cuenta ha sido verificada. Ya puedes iniciar sesión.
            </motion.p>

            <Link to="/login">
              <MotionButton whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} size="lg" className="w-full" iconRight={<Sparkles className="h-4 w-4" />}>
                Iniciar sesión ahora
              </MotionButton>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
