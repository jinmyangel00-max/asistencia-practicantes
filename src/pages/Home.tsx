import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Sun, Moon, GraduationCap, Building2, Shield, Clock, CheckCircle, ArrowRight, Users } from 'lucide-react';
import { cn } from '../lib/utils';

export function Home() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-white to-gray-50 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-100 text-gold-800 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500"></span>
              </span>
              Control de asistencia · Horario Perú (UTC-5)
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
              Control de Asistencia para{' '}
              <span className="text-primary-800">Practicantes</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Sistema moderno para registrar y controlar la asistencia de practicantes de
              <strong className="text-gray-900"> UCV </strong> y <strong className="text-gray-900"> SENATI </strong>
              en la Institución Educativa.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto" iconRight={<ArrowRight className="h-5 w-5" />}>
                  Crear mi cuenta
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Iniciar sesión
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatItem icon={GraduationCap} label="UCV" value="Ciclos 1-10" color="blue" />
            <StatItem icon={Building2} label="SENATI" value="Semestres 1-6" color="green" />
            <StatItem icon={Sun} label="Turno Mañana" value="08:00 - 08:15" color="yellow" />
            <StatItem icon={Moon} label="Turno Tarde" value="12:00 - 12:30" color="orange" />
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary-100/50 blur-3xl" />
          <div className="absolute bottom-20 right-10 h-72 w-72 rounded-full bg-gold-100/50 blur-3xl" />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Características principales
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Diseñado específicamente para las necesidades de control de asistencia en instituciones educativas
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Clock}
              title="Registro por horarios estrictos"
              description="Ventanas de 15 minutos para mañana (8:00-8:15) y 30 minutos para tarde (12:00-12:30). Solo se permite registrar dentro del horario."
              color="blue"
            />
            <FeatureCard
              icon={Shield}
              title="Autenticación segura"
              description="Supabase Auth con email/password, sesiones persistentes y protección de rutas. Cada practicante gestiona su propia cuenta."
              color="green"
            />
            <FeatureCard
              icon={Users}
              title="Panel de administración"
              description="Vista completa con filtros por fecha, institución, turno y estado. Exportación a CSV para reportes oficiales."
              color="purple"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">¿Cómo funciona?</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Proceso sencillo en 3 pasos para registrar tu asistencia diaria
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step="01"
              title="Crear cuenta"
              description="Regístrate con tu correo institucional, selecciona tu institución (UCV/SENATI), ciclo/semestre y turno de práctica."
              icon={GraduationCap}
            />
            <StepCard
              step="02"
              title="Iniciar sesión"
              description="Accede al sistema en el horario correspondiente a tu turno. La ventana de registro solo está activa 15-30 minutos."
              icon={Clock}
            />
            <StepCard
              step="03"
              title="Registrar asistencia"
              description="Presiona el botón de check-in. El sistema valida automáticamente si llegaste a tiempo o con tardanza según el horario."
              icon={CheckCircle}
            />
          </div>
        </div>
      </section>

      {/* Institutions info */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Instituciones soportadas</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Configuración específica para cada programa de prácticas
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <InstitutionCard
              name="Universidad César Vallejo"
              shortName="UCV"
              icon={GraduationCap}
              color="blue"
              cycles={Array.from({ length: 10 }, (_, i) => i + 1)}
              label="Ciclos"
            />
            <InstitutionCard
              name="SENATI"
              shortName="SENATI"
              icon={Building2}
              color="green"
              cycles={Array.from({ length: 6 }, (_, i) => i + 1)}
              label="Semestres"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-primary-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            ¿Listo para comenzar?
          </h2>
          <p className="mt-4 text-lg text-primary-100 max-w-2xl mx-auto">
            Únete al sistema de control de asistencia más eficiente para practicantes.
            Regístrate en menos de 2 minutos.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto" iconRight={<ArrowRight className="h-5 w-5" />}>
                Crear cuenta gratis
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatItem({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className="text-center p-4">
      <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-xl mb-3', colors[color as keyof typeof colors])}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="text-sm text-gray-500 font-mono">{value}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Card className="h-full transition-shadow hover:shadow-lg">
      <CardBody className="p-6">
        <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4', colors[color as keyof typeof colors])}>
          <Icon className="h-6 w-6" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mt-2 text-base">{description}</CardDescription>
      </CardBody>
    </Card>
  );
}

function StepCard({ step, title, description, icon: Icon }: { step: string; title: string; description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative text-center">
      <div className="absolute left-1/2 -translate-x-1/2 top-0">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-lg">
          {step}
        </span>
      </div>
      <div className="pt-16">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 text-primary-600 mb-4">
          <Icon className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function InstitutionCard({ name, shortName, icon: Icon, color, cycles, label }: { name: string; shortName: string; icon: React.ComponentType<{ className?: string }>; color: string; cycles: number[]; label: string }) {
  const colors = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100', badge: 'bg-blue-100 text-blue-800' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', iconBg: 'bg-green-100', badge: 'bg-green-100 text-green-800' },
  };

  const c = colors[color as keyof typeof colors] || colors.blue;

  return (
    <Card className={cn('overflow-hidden', c.bg, c.border)}>
      <CardHeader className={cn('bg-white/50 border-b', c.border)}>
        <div className="flex items-center gap-3">
          <div className={cn('p-3 rounded-xl', c.iconBg)}>
            <Icon className={cn('h-7 w-7', c.text)} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">{shortName}</p>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="flex flex-wrap gap-2">
          {cycles.map(cycle => (
            <Badge key={cycle} variant="default" className={c.badge}>
              {label} {cycle}
            </Badge>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
