import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, pattern: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, pattern, { locale: es });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'HH:mm:ss');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "EEEE dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}

export function getCurrentTimeInLima(): Date {
  // Perú está en UTC-5 todo el año (no hay horario de verano)
  const now = new Date();
  const limaOffset = -5 * 60; // en minutos
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + limaOffset * 60000);
}

export function getCurrentDateInLima(): string {
  return format(getCurrentTimeInLima(), 'yyyy-MM-dd');
}

export function getCurrentTimeStringInLima(): string {
  return format(getCurrentTimeInLima(), 'HH:mm:ss');
}

export function getCurrentShift(): 'morning' | 'afternoon' | null {
  const now = getCurrentTimeInLima();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  // Mañana: 8:00 (480) - 8:15 (495)
  if (totalMinutes >= 480 && totalMinutes <= 495) {
    return 'morning';
  }
  // Tarde: 12:00 (720) - 12:30 (750)
  if (totalMinutes >= 720 && totalMinutes <= 750) {
    return 'afternoon';
  }
  return null;
}

export function isWithinShiftWindow(shift: 'morning' | 'afternoon'): boolean {
  return getCurrentShift() === shift;
}

export function getShiftStatus(checkInTime: string, shift: 'morning' | 'afternoon'): 'on_time' | 'late' {
  const [hours, minutes] = checkInTime.split(':').map(Number);
  const checkInMinutes = hours * 60 + minutes;

  if (shift === 'morning') {
    // 8:15 = 495 minutos
    return checkInMinutes <= 495 ? 'on_time' : 'late';
  } else {
    // 12:30 = 750 minutos
    return checkInMinutes <= 750 ? 'on_time' : 'late';
  }
}

export function getShiftLabel(shift: 'morning' | 'afternoon'): string {
  return shift === 'morning' ? 'Mañana' : 'Tarde';
}

export function getInstitutionLabel(institution: 'UCV' | 'SENATI'): string {
  return institution === 'UCV' ? 'Universidad César Vallejo' : 'SENATI';
}

export function getCycleLabel(institution: 'UCV' | 'SENATI', cycle: number): string {
  return institution === 'UCV' ? `Ciclo ${cycle}` : `Semestre ${cycle}`;
}

export function validateCycle(institution: 'UCV' | 'SENATI', cycle: number): boolean {
  if (institution === 'UCV') return cycle >= 1 && cycle <= 10;
  return cycle >= 1 && cycle <= 6;
}

export function getTimeUntilNextShift(): { shift: 'morning' | 'afternoon'; minutes: number } | null {
  const now = getCurrentTimeInLima();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  // Si ya pasó la ventana de mañana, próximo es tarde
  if (totalMinutes > 495) {
    // Ventana de tarde: 720-750
    if (totalMinutes < 720) {
      return { shift: 'afternoon', minutes: 720 - totalMinutes };
    }
    if (totalMinutes <= 750) {
      return { shift: 'afternoon', minutes: 0 }; // En ventana
    }
    // Ya pasó todo, próximo es mañana del día siguiente
    const minutesUntilMidnight = 1440 - totalMinutes;
    return { shift: 'morning', minutes: minutesUntilMidnight + 480 };
  }

  // Antes o durante ventana de mañana
  if (totalMinutes < 480) {
    return { shift: 'morning', minutes: 480 - totalMinutes };
  }
  return { shift: 'morning', minutes: 0 }; // En ventana
}

export function formatMinutesToHuman(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}