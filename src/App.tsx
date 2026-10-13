import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AttendanceProvider } from './context/AttendanceContext';
import { Layout, AuthLayout, AdminLayout } from './components/layout/Layout';
import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then(module => ({ default: module.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Admin = lazy(() => import('./pages/Admin').then(module => ({ default: module.Admin })));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Cargando página">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>
  );
}

// Protección de rutas para usuarios autenticados
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Solo el perfil con rol admin puede abrir la ruta de administración.
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Redirigir si ya está autenticado
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function HomeRoute() {
  const { user, isAdmin } = useAuth();
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  return <Home />;
}

function App() {
  // Mantener sesión activa
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refrescado');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <section className="max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Falta configurar Supabase</h1>
          <p className="mt-3 text-gray-600">
            Añade <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en las variables
            de entorno de Vercel y vuelve a desplegar la aplicación.
          </p>
        </section>
      </main>
    );
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AttendanceProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/" element={<Layout />}>
                <Route index element={<HomeRoute />} />
              </Route>
              <Route path="/login" element={<AuthLayout />}>
                <Route index element={<GuestRoute><Login /></GuestRoute>} />
              </Route>
              <Route path="/register" element={<AuthLayout />}>
                <Route index element={<GuestRoute><Register /></GuestRoute>} />
              </Route>

              {/* Rutas protegidas para practicantes */}
              <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
              </Route>

              {/* Rutas de admin */}
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<Admin />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AttendanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
