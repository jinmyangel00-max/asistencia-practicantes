import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader, Sparkles } from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const MotionButton = motion.create(Button);

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, resendSignupConfirmation } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const confirmed = searchParams.get('confirmed') === 'true';

  const handleResendConfirmation = async () => {
    setResendingConfirmation(true);
    setConfirmationMessage('');
    const { error } = await resendSignupConfirmation(email);
    setResendingConfirmation(false);
    setConfirmationMessage(error
      ? error.message
      : 'Solicitud procesada. Revisa spam. Si no llega, configura un SMTP propio en Supabase.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess('¡Bienvenido! Redirigiendo al panel...');
      setShowSuccess(true);
      setLoading(false);
      setTimeout(() => navigate('/dashboard'), 1500);
    }
  };

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
        <motion.h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</motion.h1>
        <motion.p className="mt-2 text-gray-600">Accede a tu cuenta para registrar tu asistencia</motion.p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!showSuccess && (
          <motion.div key="login-form" initial="hidden" animate="visible" exit="exit" variants={itemVariants}>
            <Card className="overflow-hidden">
              <CardHeader className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-800/5 via-transparent to-gold-500/5" />
                <CardTitle className="relative">Acceso Practicante</CardTitle>
                <CardDescription className="relative">Ingresa tus credenciales para continuar</CardDescription>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {confirmed && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200"
                      role="status"
                    >
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                      <span>¡Correo confirmado! Ahora inicia sesión.</span>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200"
                      role="alert"
                    >
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {error.toLowerCase().includes('invalid login credentials') && email.includes('@') && (
                    <div className="-mt-3 space-y-2">
                      <p className="text-sm text-gray-600">Si acabas de registrarte, puede que tu correo aún no esté confirmado.</p>
                      <Button type="button" variant="outline" className="w-full" onClick={handleResendConfirmation} loading={resendingConfirmation}>
                        Reenviar confirmación de correo
                      </Button>
                      {confirmationMessage && <p className="text-sm text-gray-600" role="status">{confirmationMessage}</p>}
                    </div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200"
                      role="status"
                    >
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                      <span>{success}</span>
                    </motion.div>
                  )}

                  <motion.div variants={itemVariants}>
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
                  </motion.div>

                  <motion.div variants={itemVariants}>
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

                  <motion.div variants={itemVariants} className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-800 focus:ring-primary-500 accent-primary-600"
                      />
                      <span className="text-sm text-gray-600">Recordarme</span>
                    </label>
                    <Link to="/forgot-password" className="text-sm text-primary-800 hover:text-primary-900 font-medium transition-colors">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </motion.div>

                  <MotionButton
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={loading}
                    disabled={loading}
                  >
                    Iniciar sesión
                  </MotionButton>
                </form>

                <motion.div 
                  variants={itemVariants}
                  className="mt-6 text-center"
                >
                  <p className="text-sm text-gray-600">
                    ¿No tienes cuenta?{' '}
                    <Link to="/register" className="text-primary-800 font-medium hover:text-primary-900 transition-colors">
                      Regístrate aquí
                    </Link>
                  </p>
                </motion.div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {showSuccess && (
          <motion.div 
            key="success" 
            initial="hidden" 
            animate="visible" 
            exit="exit"
            variants={itemVariants}
            className="text-center"
          >
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
              className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6"
            >
              <CheckCircle className="h-10 w-10 text-green-600" />
            </motion.div>
            
            <motion.h2 className="text-2xl font-bold text-gray-900 mb-3">
              ¡Bienvenido!
            </motion.h2>
            
            <motion.p className="text-gray-600 mb-6">
              {success}
            </motion.p>

            <motion.div className="flex items-center justify-center gap-2 text-primary-600">
              <Loader className="h-5 w-5 animate-spin" />
              <span>Redirigiendo...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-6 p-4 rounded-xl bg-primary-50 border border-primary-100"
      >
        <h3 className="text-sm font-semibold text-primary-800 flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-gold-500" />
          Horarios de registro
        </h3>
        <dl className="mt-2 text-sm text-primary-700 space-y-1">
          <div className="flex justify-between items-center">
            <dt className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Turno Mañana:
            </dt>
            <dd className="font-mono font-medium">08:00 - 08:15</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Turno Tarde:
            </dt>
            <dd className="font-mono font-medium">12:00 - 12:30</dd>
          </div>
        </dl>
      </motion.div>
    </motion.div>
  );
}
