import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AttendanceProvider } from './context/AttendanceContext';
import { Layout, AuthLayout, AdminLayout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';

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

// Protección de rutas para admin (solo URL separada, sin verificación de rol)
function AdminRoute({ children }: { children: React.ReactNode }) {
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

function App() {
  // Mantener sesión activa
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refrescado');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AttendanceProvider>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<AuthLayout />}>
                <Route index element={<GuestRoute><Login /></GuestRoute>} />
              </Route>
              <Route path="register" element={<AuthLayout />}>
                <Route index element={<GuestRoute><Register /></GuestRoute>} />
              </Route>
            </Route>

            {/* Rutas protegidas para practicantes */}
            <Route path="/dashboard" element={<ProtectedRoute><Layout /><Dashboard /></ProtectedRoute>} />

            {/* Rutas de admin */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /><Admin /></AdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AttendanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;