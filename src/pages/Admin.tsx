import { useEffect, useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableContainer } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Calendar, Search, Download, Users, Sun, Moon, CheckCircle, AlertCircle, FileText, Play, Square, UserX, Clock } from 'lucide-react';
import { formatDate, formatTime, getCurrentDateInLima, getCurrentTimeStringInLima, getShiftLabel, getInstitutionLabel, getCycleLabel, cn } from '../lib/utils';
import type { AttendanceWithProfile } from '../lib/supabase';

interface AttendancePeriod {
  id: string;
  starts_on: string;
  ends_on: string | null;
  started_at: string;
  ended_at: string | null;
}

type RosterStatus = 'Asistió' | 'Tardanza' | 'Falta' | 'Pendiente' | 'No hay clases' | 'Periodo no activo' | 'Turno sin configurar';

export function Admin() {
  const { getAllAttendance, getAttendanceByDateRange, refreshControlStatus } = useAttendance();
  const [attendance, setAttendance] = useState<AttendanceWithProfile[]>([]);
  const [practitioners, setPractitioners] = useState<Profile[]>([]);
  const [periods, setPeriods] = useState<AttendancePeriod[]>([]);
  const [controlLoading, setControlLoading] = useState(true);
  const [controlBusy, setControlBusy] = useState(false);
  const [controlMessage, setControlMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState(getCurrentDateInLima());
  const [institutionFilter, setInstitutionFilter] = useState<'all' | 'UCV' | 'SENATI'>('all');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'late'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'range'>('day');
  const [stats, setStats] = useState({ total: 0, morning: 0, afternoon: 0, onTime: 0, late: 0 });

  useEffect(() => {
    loadAttendance();
  }, [dateFilter, dateRange, viewMode]);

  useEffect(() => {
    void loadControlData();
  }, []);

  const loadControlData = async () => {
    setControlLoading(true);
    const [profileResult, periodResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'practicante').order('full_name'),
      supabase.from('attendance_periods').select('*').order('started_at', { ascending: false }),
    ]);
    if (profileResult.error || periodResult.error) {
      setControlMessage(profileResult.error?.message || periodResult.error?.message || 'No se pudo cargar el panel de control.');
      setControlLoading(false);
      return;
    }
    setPractitioners((profileResult.data || []) as Profile[]);
    setPeriods((periodResult.data || []) as AttendancePeriod[]);
    setControlLoading(false);
  };

  const handleStartPeriod = async () => {
    setControlBusy(true);
    setControlMessage('');
    const { error } = await supabase.rpc('start_attendance_period');
    if (error) {
      setControlMessage(error.message);
    } else {
      setControlMessage('Asistencias iniciadas. Los practicantes ya pueden registrar dentro de sus horarios.');
      await Promise.all([loadControlData(), refreshControlStatus()]);
    }
    setControlBusy(false);
  };

  const handleStopPeriod = async () => {
    if (!window.confirm('¿Terminar el periodo de asistencias? Los practicantes ya no podrán registrar entradas.')) return;
    setControlBusy(true);
    setControlMessage('');
    const { error } = await supabase.rpc('stop_attendance_period');
    if (error) {
      setControlMessage(error.message);
    } else {
      setControlMessage('Periodo terminado. Se conservaron todos los registros y se bloqueó el check-in.');
      await Promise.all([loadControlData(), refreshControlStatus()]);
    }
    setControlBusy(false);
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      let data: AttendanceWithProfile[];
      if (viewMode === 'range' && dateRange) {
        data = await getAttendanceByDateRange(dateRange.start, dateRange.end);
      } else {
        data = await getAllAttendance(dateFilter);
      }
      setAttendance(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: AttendanceWithProfile[]) => {
    setStats({
      total: data.length,
      morning: data.filter(a => a.shift === 'morning').length,
      afternoon: data.filter(a => a.shift === 'afternoon').length,
      onTime: data.filter(a => a.status === 'on_time').length,
      late: data.filter(a => a.status === 'late').length,
    });
  };

  const filteredAttendance = attendance.filter(record => {
    if (institutionFilter !== 'all' && record.profiles?.institution !== institutionFilter) return false;
    if (shiftFilter !== 'all' && record.shift !== shiftFilter) return false;
    if (statusFilter !== 'all' && record.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = record.profiles?.full_name?.toLowerCase() || '';
      const email = record.profiles?.email?.toLowerCase() || '';
      if (!name.includes(query) && !email.includes(query)) return false;
    }
    return true;
  });

  const activePeriod = periods.find(period => period.ended_at === null);
  const rosterStatus = (profile: Profile): RosterStatus => {
    if (loading) return 'Pendiente';
    if (!profile.shift) return 'Turno sin configurar';
    const weekday = new Date(`${dateFilter}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) return 'No hay clases';
    const period = periods.find(item => dateFilter >= item.starts_on && (!item.ends_on || dateFilter <= item.ends_on));
    if (!period) return 'Periodo no activo';
    const checkin = attendance.find(item => item.user_id === profile.id && item.shift === profile.shift);
    if (checkin) return checkin.status === 'on_time' ? 'Asistió' : 'Tardanza';
    if (dateFilter < getCurrentDateInLima()) return 'Falta';
    if (dateFilter === getCurrentDateInLima()) {
      const deadline = profile.shift === 'morning' ? '08:16:00' : '12:31:00';
      const periodWasClosedToday = period.ended_at !== null && period.ends_on === dateFilter;
      if (periodWasClosedToday || getCurrentTimeStringInLima() >= deadline) return 'Falta';
    }
    return 'Pendiente';
  };
  const rosterCounts = practitioners.reduce((counts, profile) => {
    const status = rosterStatus(profile);
    if (status === 'Asistió' || status === 'Tardanza' || status === 'Falta' || status === 'Pendiente') counts[status]++;
    return counts;
  }, { 'Asistió': 0, 'Tardanza': 0, 'Falta': 0, 'Pendiente': 0 });

  const handleExport = () => {
    const headers = ['Fecha', 'Nombre', 'Correo', 'Institución', 'Ciclo/Semestre', 'Turno', 'Hora Entrada', 'Estado'];
    const rows = filteredAttendance.map(record => [
      formatDate(record.date),
      record.profiles?.full_name || '',
      record.profiles?.email || '',
      getInstitutionLabel(record.profiles?.institution || 'UCV'),
      getCycleLabel(record.profiles?.institution || 'UCV', record.profiles?.cycle_or_semester || 1),
      getShiftLabel(record.shift),
      formatTime(record.check_in_time),
      record.status === 'on_time' ? 'A tiempo' : 'Tardanza',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asistencia_${viewMode === 'range' && dateRange ? `${dateRange.start}_a_${dateRange.end}` : dateFilter}.csv`;
    link.click();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary-600" />
            Panel de Administración
          </h1>
          <p className="text-gray-600">Vista general de todas las asistencias registradas</p>
        </div>
        <Button onClick={handleExport} variant="outline" icon={<Download className="h-4 w-4" />}>
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            Control del periodo de prácticas
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant={activePeriod ? 'success' : 'warning'}>
                {activePeriod ? 'Asistencias iniciadas' : 'Asistencias detenidas'}
              </Badge>
              <p className="mt-2 text-sm text-gray-600">
                {activePeriod
                  ? `Periodo iniciado el ${formatDate(activePeriod.starts_on)}. Los registros se aceptan de lunes a viernes en los horarios asignados.`
                  : 'Inicia el periodo cuando comiencen las clases. Al terminarlo, se bloquearán nuevos registros.'}
              </p>
            </div>
            {activePeriod ? (
              <Button variant="danger" onClick={handleStopPeriod} loading={controlBusy} disabled={controlLoading} icon={<Square className="h-4 w-4" />}>
                Terminar asistencias
              </Button>
            ) : (
              <Button onClick={handleStartPeriod} loading={controlBusy} disabled={controlLoading} icon={<Play className="h-4 w-4" />}>
                Iniciar asistencias
              </Button>
            )}
          </div>
          {controlMessage && <p className="text-sm text-primary-700" role="status">{controlMessage}</p>}
        </CardBody>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total" value={stats.total} icon={Users} color="primary" />
        <StatCard title="Mañana" value={stats.morning} icon={Sun} color="blue" />
        <StatCard title="Tarde" value={stats.afternoon} icon={Moon} color="orange" />
        <StatCard title="A tiempo" value={stats.onTime} icon={CheckCircle} color="green" />
        <StatCard title="Tardanzas" value={stats.late} icon={AlertCircle} color="red" />
      </div>

      {viewMode === 'day' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3">
              <UserX className="h-5 w-5 text-primary-600" />
              Asistencia y faltas del {formatDate(dateFilter)}
              <span className="text-sm font-normal text-gray-500">
                {rosterCounts['Falta']} faltas · {rosterCounts['Asistió'] + rosterCounts['Tardanza']} asistencias · {rosterCounts['Pendiente']} pendientes
              </span>
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {practitioners.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-500">Aún no hay practicantes registrados.</p>
            ) : (
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Practicante</TableHead>
                      <TableHead>Institución</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Estado del día</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {practitioners.map(profile => {
                      const status = rosterStatus(profile);
                      const statusVariant = status === 'Falta' ? 'danger' : status === 'Asistió' ? 'success' : status === 'Tardanza' ? 'warning' : 'default';
                      return (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.full_name}</TableCell>
                          <TableCell>{profile.institution || '—'}{profile.cycle_or_semester ? ` · ${getCycleLabel(profile.institution!, profile.cycle_or_semester)}` : ''}</TableCell>
                          <TableCell>{profile.shift ? getShiftLabel(profile.shift) : '—'}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant}>{status === 'Pendiente' && <Clock className="mr-1 inline h-3 w-3" />}{status}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Modo de vista */}
            <div className="flex gap-2 border rounded-lg p-1 bg-gray-50">
              <button
                onClick={() => { setViewMode('day'); setDateRange(null); }}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  viewMode === 'day' ? 'bg-white text-primary-800 shadow' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Día
              </button>
              <button
                onClick={() => setViewMode('range')}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  viewMode === 'range' ? 'bg-white text-primary-800 shadow' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Rango
              </button>
            </div>

            {/* Filtro de fecha */}
            {viewMode === 'day' ? (
              <div className="flex items-center gap-2">
                <label htmlFor="admin-date" className="label-field mb-0">Fecha</label>
                <input
                  id="admin-date"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  max={getCurrentDateInLima()}
                  className="input-field w-48"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="label-field mb-0">Desde</label>
                <input
                  type="date"
                  value={dateRange?.start || ''}
                  onChange={(e) => setDateRange(prev => ({ ...(prev || { start: '', end: '' }), start: e.target.value }))}
                  max={getCurrentDateInLima()}
                  className="input-field w-40"
                />
                <label className="label-field mb-0">Hasta</label>
                <input
                  type="date"
                  value={dateRange?.end || ''}
                  onChange={(e) => setDateRange(prev => ({ ...(prev || { start: '', end: '' }), end: e.target.value }))}
                  max={getCurrentDateInLima()}
                  className="input-field w-40"
                />
              </div>
            )}

            {/* Filtros adicionales */}
            <Select
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value as 'all' | 'UCV' | 'SENATI')}
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'UCV', label: 'UCV' },
                { value: 'SENATI', label: 'SENATI' },
              ]}
              className="w-40"
            />

            <Select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value as 'all' | 'morning' | 'afternoon')}
              options={[
                { value: 'all', label: 'Todos turnos' },
                { value: 'morning', label: 'Mañana' },
                { value: 'afternoon', label: 'Tarde' },
              ]}
              className="w-40"
            />

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'on_time' | 'late')}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'on_time', label: 'A tiempo' },
                { value: 'late', label: 'Tardanzas' },
              ]}
              className="w-40"
            />

            <Input
              placeholder="Buscar por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
              icon={<Search className="h-5 w-5 text-gray-400" />}
            />
          </div>
        </CardBody>
      </Card>

      {/* Tabla de asistencias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            Registros de asistencia ({filteredAttendance.length} de {attendance.length})
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay registros de asistencia para los filtros seleccionados</p>
            </div>
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Institución</TableHead>
                    <TableHead>Ciclo/Semestre</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Hora Entrada</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono whitespace-nowrap">{formatDate(record.date)}</TableCell>
                      <TableCell className="font-medium">{record.profiles?.full_name || '—'}</TableCell>
                      <TableCell className="text-gray-500 max-w-xs truncate">{record.profiles?.email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="default" className={cn(
                          record.profiles?.institution === 'UCV' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        )}>
                          {getInstitutionLabel(record.profiles?.institution || 'UCV')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-center">
                        {getCycleLabel(record.profiles?.institution || 'UCV', record.profiles?.cycle_or_semester || 1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={record.shift === 'morning' ? 'morning' : 'afternoon'}>
                          {getShiftLabel(record.shift)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap">{formatTime(record.check_in_time)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={record.status === 'on_time' ? 'success' : 'warning'}>
                          {record.status === 'on_time' ? 'A tiempo' : 'Tardanza'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className={cn('rounded-xl border p-4', colors[color as keyof typeof colors] || colors.primary)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="h-8 w-8 opacity-50" />
      </div>
    </div>
  );
}
