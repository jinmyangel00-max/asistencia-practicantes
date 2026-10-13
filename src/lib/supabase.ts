import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value || value.includes('TU-PROJECT-REF')) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured =
  isValidSupabaseUrl(supabaseUrl) &&
  Boolean(supabaseAnonKey && supabaseAnonKey !== 'TU_CLAVE_PUBLICA');

// App muestra un mensaje de configuración antes de montar componentes que usen el cliente.
export const supabase = createClient(
  isValidSupabaseUrl(supabaseUrl) ? supabaseUrl : 'https://configuracion-pendiente.supabase.co',
  supabaseAnonKey || 'configuracion-pendiente',
);

// Tipos para TypeScript
export type UserRole = 'practicante' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  institution: 'UCV' | 'SENATI' | null;
  cycle_or_semester: number | null; // 1-10 para UCV, 1-6 para SENATI; null para admin
  shift: 'morning' | 'afternoon' | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  check_in_time: string; // HH:MM:SS
  shift: 'morning' | 'afternoon';
  status: 'on_time' | 'late';
  created_at: string;
  profiles?: Profile;
}

export interface AttendanceWithProfile extends Attendance {
  profiles: Profile;
}

// Constantes de horario
export const SHIFT_SCHEDULES = {
  morning: { start: '08:00', end: '08:15' },
  afternoon: { start: '12:00', end: '12:30' },
} as const;

export const INSTITUTIONS = {
  UCV: { label: 'UCV', cycles: Array.from({ length: 10 }, (_, i) => i + 1) },
  SENATI: { label: 'SENATI', semesters: Array.from({ length: 6 }, (_, i) => i + 1) },
} as const;
