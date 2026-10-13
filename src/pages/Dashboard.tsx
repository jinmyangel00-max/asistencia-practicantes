import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableContainer } from '../components/ui/Table';
import { CheckCircle, Clock, Calendar, Sun, Moon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDate, formatTime, getCurrentDateInLima, getShiftLabel, getShiftStatus, getCycleLabel, cn } from '../lib/utils';
import { SHIFT_SCHEDULES } from '../lib/supabase';
import { Navigate } from 'react-router-dom';

export function Dashboard() {
  const { profile, profileError } = useAuth();
  const { checkIn, getMyAttendance, loading: attendanceLoading, currentShift, attendanceActive } = useAttendance();
  const [myAttendance, setMyAttendance] = useState<Awaited<ReturnType<typeof getMyAttendance>>>([]);
  const [checkingIn, setCheckingIn] = useState<'morning' | 'afternoon' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(getCurrentDateInLima());

  useEffect(() => {
    loadAttendance(selectedDate);
  }, [selectedDate]);

  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;

  const loadAttendance = async (date: string) => {
    const data = await getMyAttendance(date);
    setMyAttendance(data);
  };

  const handleCheckIn = async (shift: 'morning' | 'afternoon') => {
    setCheckingIn(shift);
    setMessage(null);
    
    const result = await checkIn(shift);
    
    if (result.success) {
      setMessage({ type: 'success', text: `✅ Asistencia registrada para turno de ${getShiftLabel(shift)} a las ${formatTime(result.attendance!.check_in_time)}` });
      loadAttendance(selectedDate);
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al registrar asistencia' });
    }
    
    setCheckingIn(null);
  };

  const today = getCurrentDateInLima();
  const isToday = selectedDate === today;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header del dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Asistencia</h1>
          <p className="text-gray-600">
            {profile ? `Hola, ${profile.full_name}. Registra tu entrada y revisa tu historial` : 'Registra tu entrada y revisa tu historial'}
          </p>
        </div>
        {profile?.shift && profile.institution && profile.cycle_or_semester !== null ? (
          <div className="flex items-center gap-3">
            <Badge variant={profile.shift === 'morning' ? 'morning' : 'afternoon'}>
              Turno: {getShiftLabel(profile.shift)}
            </Badge>
            <Badge variant="default" className="bg-primary-100 text-primary-800">
              {profile.institution} - {getCycleLabel(profile.institution, profile.cycle_or_semester)}
            </Badge>
          </div>
        ) : (
          <Badge variant="warning">Perfil no disponible</Badge>
        )}
      </div>

      {!profile && profileError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          No se pudo cargar tu perfil: {profileError}
        </div>
      )}

      {/* Tarjeta de check-in rápido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            Registro de entrada - {formatDate(selectedDate, "EEEE dd 'de' MMMM")}
          </CardTitle>
          <CardDescription>
            Selecciona tu turno y registra tu asistencia dentro del horario permitido
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Turno Mañana */}
            <div className={cn(
              'p-4 rounded-lg border-2 transition-all relative',
              currentShift === 'morning' && isToday
                ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                : 'border-gray-200 hover:border-gray-300'
            )}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Sun className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Turno Mañana</h3>
                  <p className="text-sm text-gray-500 font-mono">{SHIFT_SCHEDULES.morning.start} - {SHIFT_SCHEDULES.morning.end}</p>
                </div>
              </div>

              {isToday && currentShift === 'morning' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">¡Ventana de registro ABIERTA!</span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => handleCheckIn('morning')}
                    loading={checkingIn === 'morning'}
                    disabled={myAttendance.some(a => a.shift === 'morning')}
                  >
                    {myAttendance.some(a => a.shift === 'morning') ? (
                      <>✓ Ya registrada</>
                    ) : (
                      <>Registrar entrada</>
                    )}
                  </Button>
                  {myAttendance.some(a => a.shift === 'morning') && (
                    <p className="text-center text-sm text-green-600">
                      Registrado a las {formatTime(myAttendance.find(a => a.shift === 'morning')!.check_in_time)}
                      <Badge variant={myAttendance.find(a => a.shift === 'morning')!.status === 'on_time' ? 'success' : 'warning'} className="ml-2">
                        {myAttendance.find(a => a.shift === 'morning')!.status === 'on_time' ? 'A tiempo' : 'Tardanza'}
                      </Badge>
                    </p>
                  )}
                </div>
              ) : isToday && currentShift !== 'morning' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-500 bg-gray-50 p-2 rounded">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{attendanceActive ? 'Ventana cerrada o no disponible' : 'El administrador aún no inicia las asistencias'}</span>
                  </div>
                  <Button variant="outline" className="w-full" disabled>
                    No disponible
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-gray-500">Selecciona esta fecha para ver disponibilidad</p>
              )}
            </div>

            {/* Turno Tarde */}
            <div className={cn(
              'p-4 rounded-lg border-2 transition-all relative',
              currentShift === 'afternoon' && isToday
                ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                : 'border-gray-200 hover:border-gray-300'
            )}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Moon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Turno Tarde</h3>
                  <p className="text-sm text-gray-500 font-mono">{SHIFT_SCHEDULES.afternoon.start} - {SHIFT_SCHEDULES.afternoon.end}</p>
                </div>
              </div>

              {isToday && currentShift === 'afternoon' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">¡Ventana de registro ABIERTA!</span>
                  </div>
                  <Button
                    className="w-full"
                    variant="secondary"
                    size="lg"
                    onClick={() => handleCheckIn('afternoon')}
                    loading={checkingIn === 'afternoon'}
                    disabled={myAttendance.some(a => a.shift === 'afternoon')}
                  >
                    {myAttendance.some(a => a.shift === 'afternoon') ? (
                      <>✓ Ya registrada</>
                    ) : (
                      <>Registrar entrada</>
                    )}
                  </Button>
                  {myAttendance.some(a => a.shift === 'afternoon') && (
                    <p className="text-center text-sm text-green-600">
                      Registrado a las {formatTime(myAttendance.find(a => a.shift === 'afternoon')!.check_in_time)}
                      <Badge variant={myAttendance.find(a => a.shift === 'afternoon')!.status === 'on_time' ? 'success' : 'warning'} className="ml-2">
                        {myAttendance.find(a => a.shift === 'afternoon')!.status === 'on_time' ? 'A tiempo' : 'Tardanza'}
                      </Badge>
                    </p>
                  )}
                </div>
              ) : isToday && currentShift !== 'afternoon' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-500 bg-gray-50 p-2 rounded">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{attendanceActive ? 'Ventana cerrada o no disponible' : 'El administrador aún no inicia las asistencias'}</span>
                  </div>
                  <Button variant="outline" className="w-full" disabled>
                    No disponible
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-gray-500">Selecciona esta fecha para ver disponibilidad</p>
              )}
            </div>
          </div>

          {/* Selector de fecha para ver historial */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <label htmlFor="date-select" className="label-field">Ver historial de otra fecha</label>
            <input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="input-field max-w-xs"
            />
          </div>
        </CardBody>
      </Card>

      {/* Mensajes de éxito/error */}
      {message && (
        <div className={cn(
          'fixed bottom-4 right-4 z-50 animate-slide-in px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm',
          message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        )} role="alert">
          {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {/* Historial de asistencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary-600" />
            Historial de asistencia - {formatDate(selectedDate, "EEEE dd 'de' MMMM")}
          </CardTitle>
        </CardHeader>
        <CardBody>
          {attendanceLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : myAttendance.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay registros de asistencia para esta fecha</p>
            </div>
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turno</TableHead>
                    <TableHead>Hora de entrada</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Observación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myAttendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Badge variant={record.shift === 'morning' ? 'morning' : 'afternoon'}>
                          {getShiftLabel(record.shift)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{formatTime(record.check_in_time)}</TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'on_time' ? 'success' : 'warning'}>
                          {record.status === 'on_time' ? 'A tiempo' : 'Tardanza'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.status === 'on_time' ? (
                          <span className="text-green-600 text-sm">Dentro del horario permitido</span>
                        ) : (
                          <span className="text-orange-600 text-sm">Fuera del horario ({getShiftStatus(record.check_in_time, record.shift) === 'late' ? 'llegada tardía' : ''})</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardBody>
      </Card>

      {/* Resumen de la semana (opcional) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary-600" />
            Resumen de la semana
          </CardTitle>
        </CardHeader>
        <CardBody>
          <WeeklySummary userId={profile?.id} />
        </CardBody>
      </Card>
    </div>
  );
}

// Componente separado para el resumen semanal
function WeeklySummary({ userId }: { userId?: string }) {
  const { getAttendanceByDateRange } = useAttendance();
  const [summary, setSummary] = useState<{ date: string; morning: boolean; afternoon: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      setLoading(true);
      setError(null);

      if (!userId) {
        setSummary([]);
        setLoading(false);
        return;
      }

      const end = getCurrentDateInLima();
      const [year, month, day] = end.split('-').map(Number);
      const endDate = new Date(Date.UTC(year, month - 1, day));
      const startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - 6);
      const start = startDate.toISOString().slice(0, 10);

      try {
        const data = await getAttendanceByDateRange(start, end);
        if (!active) return;

        const grouped = data.reduce((acc, record) => {
          if (!acc[record.date]) acc[record.date] = { morning: false, afternoon: false };
          acc[record.date][record.shift] = true;
          return acc;
        }, {} as Record<string, { morning: boolean; afternoon: boolean }>);

        const result = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(endDate);
          date.setUTCDate(date.getUTCDate() - i);
          const dateStr = date.toISOString().slice(0, 10);
          result.push({
            date: dateStr,
            morning: grouped[dateStr]?.morning || false,
            afternoon: grouped[dateStr]?.afternoon || false,
          });
        }
        setSummary(data.length === 0 ? [] : result.reverse());
      } catch (loadError) {
        if (!active) return;
        setSummary([]);
        const message =
          loadError instanceof Error
            ? loadError.message
            : typeof loadError === 'object' && loadError !== null && 'message' in loadError && typeof loadError.message === 'string'
              ? loadError.message
              : 'Error desconocido';
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadSummary();
    return () => { active = false; };
  }, [userId, getAttendanceByDateRange]);

  if (loading) return <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" /></div>;

  if (!userId) return <p className="py-4 text-center text-sm text-gray-500">El resumen estará disponible cuando se cargue tu perfil.</p>;
  if (error) return <p className="py-4 text-center text-sm text-red-600" role="alert">No se pudo cargar el resumen semanal: {error}</p>;
  if (summary.length === 0) return <p className="py-4 text-center text-sm text-gray-500">Aún no registras asistencias esta semana.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-center text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 px-3 font-medium text-gray-600">Fecha</th>
            <th className="py-2 px-3 font-medium text-gray-600">Mañana</th>
            <th className="py-2 px-3 font-medium text-gray-600">Tarde</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(day => (
            <tr key={day.date} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-mono">{formatDate(day.date, 'dd/MM')}</td>
              <td className="py-2 px-3">
                {day.morning ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-2 px-3">
                {day.afternoon ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
