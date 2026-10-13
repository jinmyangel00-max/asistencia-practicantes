import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  signUp: (email: string, password: string, data: Partial<Profile>, adminRegistrationCode?: string) => Promise<{ error: Error | null }>;
  resendSignupConfirmation: (email: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // No hacer llamadas asíncronas a Supabase dentro de este callback:
        // Auth mantiene un bloqueo mientras se ejecuta y la consulta del perfil
        // podría quedar esperando ese mismo bloqueo.
        const userId = session.user.id;
        window.setTimeout(() => {
          void fetchProfile(userId);
        }, 0);
      } else {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    setProfile(null);
    setProfileError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
            ? error.message
            : 'No se pudo cargar tu perfil';
      setProfileError(message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, profileData: Partial<Profile>, adminRegistrationCode?: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (profileData.role === 'admin') {
      const { data: registrationStatus, error: statusError } = await supabase.rpc(
        'check_admin_registration_code',
        { p_code: adminRegistrationCode ?? '' },
      );
      if (!statusError && registrationStatus === 'already_registered') {
        return { error: new Error('ADMIN_ALREADY_REGISTERED') };
      }
      if (!statusError && registrationStatus === 'invalid_code') {
        return { error: new Error('ADMIN_CODE_INVALID') };
      }
      if (statusError) {
        return { error: new Error('ADMIN_VALIDATION_UNAVAILABLE') };
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: profileData.full_name,
          institution: profileData.institution,
          cycle_or_semester: profileData.cycle_or_semester,
          shift: profileData.shift,
          role: profileData.role ?? 'practicante',
          ...(profileData.role === 'admin' ? { admin_registration_code: adminRegistrationCode } : {}),
        },
      },
    });
    
    if (error) {
      if (/already registered|user already exists/i.test(error.message)) {
        return { error: new Error('EMAIL_ALREADY_REGISTERED') };
      }
      if (profileData.role === 'admin' && /database error saving new user/i.test(error.message)) {
        const { data: registrationStatus, error: statusError } = await supabase.rpc(
          'check_admin_registration_code',
          { p_code: adminRegistrationCode ?? '' },
        );
        if (!statusError && registrationStatus === 'already_registered') {
          return { error: new Error('ADMIN_ALREADY_REGISTERED') };
        }
        if (!statusError && registrationStatus === 'invalid_code') {
          return { error: new Error('ADMIN_CODE_INVALID') };
        }
        if (statusError) return { error: new Error('ADMIN_VALIDATION_UNAVAILABLE') };
      }
      return { error };
    }

    // Supabase oculta si un correo confirmado ya existe y devuelve un usuario
    // ficticio sin identidades. No mostrar la pantalla de confirmación en ese caso.
    if (data.user && data.user.identities?.length === 0) {
      return { error: new Error('EMAIL_ALREADY_REGISTERED') };
    }
    
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const resendSignupConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        profileError,
        loading,
        signUp,
        resendSignupConfirmation,
        signIn,
        signOut,
        refreshProfile,
        isAdmin: profile?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
