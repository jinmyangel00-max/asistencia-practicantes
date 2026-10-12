-- =============================================
-- ESQUEMA DE BASE DE DATOS PARA SUPABASE
-- Sistema de Asistencia de Practicantes
-- =============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: profiles (perfiles de usuario)
-- =============================================
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    institution TEXT NOT NULL CHECK (institution IN ('UCV', 'SENATI')),
    cycle_or_semester INTEGER NOT NULL CHECK (
        (institution = 'UCV' AND cycle_or_semester BETWEEN 1 AND 10) OR
        (institution = 'SENATI' AND cycle_or_semester BETWEEN 1 AND 6)
    ),
    shift TEXT NOT NULL CHECK (shift IN ('morning', 'afternoon')),
    role TEXT NOT NULL DEFAULT 'practicante' CHECK (role IN ('practicante', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para profiles
CREATE INDEX idx_profiles_institution ON public.profiles(institution);
CREATE INDEX idx_profiles_shift ON public.profiles(shift);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Enable insert for authentication"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- TABLA: attendance (registros de asistencia)
-- =============================================
CREATE TABLE public.attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    check_in_time TIME NOT NULL,
    shift TEXT NOT NULL CHECK (shift IN ('morning', 'afternoon')),
    status TEXT NOT NULL DEFAULT 'on_time' CHECK (status IN ('on_time', 'late')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint único: un usuario solo puede registrar una vez por turno por día
CREATE UNIQUE INDEX idx_attendance_unique_per_shift_per_day
    ON public.attendance (user_id, date, shift);

-- Índices para attendance
CREATE INDEX idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_shift ON public.attendance(shift);
CREATE INDEX idx_attendance_status ON public.attendance(status);
CREATE INDEX idx_attendance_created_at ON public.attendance(created_at);

-- RLS para attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Políticas para attendance
CREATE POLICY "Users can view own attendance"
    ON public.attendance FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance"
    ON public.attendance FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins pueden ver todas las asistencias
CREATE POLICY "Admins can view all attendance"
    ON public.attendance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins pueden insertar/actualizar/eliminar cualquier asistencia
CREATE POLICY "Admins can manage all attendance"
    ON public.attendance FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- FUNCIONES Y TRIGGERS
-- =============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para profiles.updated_at
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, institution, cycle_or_semester, shift, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'institution',
        (NEW.raw_user_meta_data->>'cycle_or_semester')::INTEGER,
        NEW.raw_user_meta_data->>'shift',
        COALESCE(NEW.raw_user_meta_data->>'role', 'practicante')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil en signup
CREATE TRIGGER trigger_handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Función para validar horario de check-in (lado servidor)
CREATE OR REPLACE FUNCTION public.validate_checkin_time(
    p_shift TEXT,
    p_check_in_time TIME
)
RETURNS TEXT AS $$
DECLARE
    v_status TEXT := 'on_time';
BEGIN
    IF p_shift = 'morning' THEN
        -- Ventana: 08:00 - 08:15
        IF p_check_in_time > '08:15:00'::TIME THEN
            v_status := 'late';
        END IF;
    ELSIF p_shift = 'afternoon' THEN
        -- Ventana: 12:00 - 12:30
        IF p_check_in_time > '12:30:00'::TIME THEN
            v_status := 'late';
        END IF;
    END IF;
    RETURN v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VISTAS ÚTILES
-- =============================================

-- Vista: Asistencia con datos de perfil
CREATE VIEW public.attendance_with_profile AS
SELECT
    a.*,
    p.full_name,
    p.email,
    p.institution,
    p.cycle_or_semester,
    p.shift AS user_shift,
    p.role
FROM public.attendance a
JOIN public.profiles p ON a.user_id = p.id;

-- Vista: Resumen diario de asistencia
CREATE VIEW public.daily_attendance_summary AS
SELECT
    a.date,
    a.shift,
    COUNT(*) AS total_checkins,
    COUNT(*) FILTER (WHERE a.status = 'on_time') AS on_time_count,
    COUNT(*) FILTER (WHERE a.status = 'late') AS late_count,
    p.institution,
    p.cycle_or_semester
FROM public.attendance a
JOIN public.profiles p ON a.user_id = p.id
GROUP BY a.date, a.shift, p.institution, p.cycle_or_semester
ORDER BY a.date DESC, a.shift;

-- =============================================
-- DATOS DE PRUEBA (OPCIONAL)
-- =============================================

-- Para crear un usuario admin manualmente:
-- 1. Regístrate normalmente desde la app
-- 2. Ejecuta en SQL Editor:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';

-- =============================================
-- NOTAS DE CONFIGURACIÓN
-- =============================================

/*
1. EJECUTAR EN SUPABASE SQL EDITOR:
   - Copia y pega este archivo completo
   - Ejecuta como script

2. CONFIGURAR AUTENTICACIÓN:
   - En Authentication > Settings > Email Auth
   - Habilitar "Enable email confirmations" (opcional)
   - Configurar Site URL: http://localhost:5173 (dev) / tu-dominio.com (prod)
   - Redirect URLs: http://localhost:5173/**, https://tu-dominio.com/**

3. VARIABLES DE ENTORNO (.env):
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key

4. HORARIOS CONFIGURADOS:
   - Turno Mañana: 08:00 - 08:15 (15 min ventana)
   - Turno Tarde: 12:00 - 12:30 (30 min ventana)
   - Zona horaria: Perú (UTC-5) - Manejado en frontend

5. INSTITUCIONES Y CICLOS:
   - UCV: Ciclos 1-10
   - SENATI: Semestres 1-6
*/