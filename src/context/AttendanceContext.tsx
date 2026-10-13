import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Attendance, AttendanceWithProfile } from '../lib/supabase';
import { getCurrentShift } from '../lib/utils';
import { useAuth } from './AuthContext';

interface AttendanceContextType {
  checkIn: (shift: 'morning' | 'afternoon') => Promise<{ success: boolean; error?: string; attendance?: Attendance }>;
  getMyAttendance: (date?: string) => Promise<Attendance[]>;
  getAllAttendance: (date?: string) => Promise<AttendanceWithProfile[]>;
  getAttendanceByDateRange: (startDate: string, endDate: string) => Promise<AttendanceWithProfile[]>;
  loading: boolean;
  currentShift: 'morning' | 'afternoon' | null;
  canCheckIn: (shift: 'morning' | 'afternoon') => boolean;
  attendanceActive: boolean;
  refreshControlStatus: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | null>(null);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [attendanceActive, setAttendanceActive] = useState(false);
  const [currentShift, setCurrentShift] = useState<'morning' | 'afternoon' | null>(getCurrentShift());

  const refreshControlStatus = useCallback(async () => {
    if (!user) {
      setAttendanceActive(false);
      return;
    }
    const { data, error } = await supabase.rpc('attendance_period_status');
    if (error) {
      console.error('Error loading attendance period status:', error);
      setAttendanceActive(false);
      return;
    }
    const status = Array.isArray(data) ? data[0] : data;
    setAttendanceActive(Boolean(status?.is_active));
  }, [user]);

  useEffect(() => {
    void refreshControlStatus();
    const interval = window.setInterval(() => {
      setCurrentShift(getCurrentShift());
      void refreshControlStatus();
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [refreshControlStatus]);

  const canCheckIn = useCallback((shift: 'morning' | 'afternoon') => {
    return attendanceActive && currentShift === shift;
  }, [attendanceActive, currentShift]);

  const checkIn = async (shift: 'morning' | 'afternoon') => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          shift,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, attendance: data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error al registrar asistencia' };
    } finally {
      setLoading(false);
    }
  };

  const getMyAttendance = async (date?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const targetDate = date || getCurrentDateInLima();

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .order('check_in_time', { ascending: true });

    if (error) throw error;
    return data || [];
  };

  const getAllAttendance = async (date?: string) => {
    const targetDate = date || getCurrentDateInLima();

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        profiles:profiles(*)
      `)
      .eq('date', targetDate)
      .order('check_in_time', { ascending: true });

    if (error) throw error;
    return (data || []) as AttendanceWithProfile[];
  };

  const getAttendanceByDateRange = async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        profiles:profiles(*)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('check_in_time', { ascending: true });

    if (error) throw error;
    return (data || []) as AttendanceWithProfile[];
  };

  return (
    <AttendanceContext.Provider
      value={{
        checkIn,
        getMyAttendance,
        getAllAttendance,
        getAttendanceByDateRange,
        loading,
        currentShift: attendanceActive ? currentShift : null,
        canCheckIn,
        attendanceActive,
        refreshControlStatus,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) throw new Error('useAttendance must be used within AttendanceProvider');
  return context;
}
