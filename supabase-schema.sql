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
    institution TEXT CHECK (institution IN ('UCV', 'SENATI')),
    cycle_or_semester INTEGER CHECK (
        (institution = 'UCV' AND cycle_or_semester BETWEEN 1 AND 10) OR
        (institution = 'SENATI' AND cycle_or_semester BETWEEN 1 AND 6)
    ),
    shift TEXT CHECK (shift IN ('morning', 'afternoon')),
    role TEXT NOT NULL DEFAULT 'practicante' CHECK (role IN ('practicante', 'admin')),
    CONSTRAINT profiles_role_details_check CHECK (
        (role = 'admin' AND institution IS NULL AND cycle_or_semester IS NULL AND shift IS NULL)
        OR
        (role = 'practicante' AND institution IS NOT NULL AND cycle_or_semester IS NOT NULL AND shift IS NOT NULL)
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para profiles
CREATE INDEX idx_profiles_institution ON public.profiles(institution);
CREATE INDEX idx_profiles_shift ON public.profiles(shift);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Solo puede existir un perfil con rol admin.
CREATE UNIQUE INDEX idx_profiles_single_admin
    ON public.profiles (role) WHERE role = 'admin';

-- Clave privada para permitir un único registro inicial de administrador.
CREATE TABLE public.admin_registration (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    registration_code TEXT,
    claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.admin_registration ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_registration FROM anon, authenticated;
INSERT INTO public.admin_registration (singleton) VALUES (TRUE);

CREATE UNIQUE INDEX idx_profiles_email_normalized
    ON public.profiles (lower(btrim(email)));

CREATE OR REPLACE FUNCTION public.check_admin_registration_code(p_code TEXT)
RETURNS TEXT AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin')
       OR EXISTS (
           SELECT 1 FROM public.admin_registration
           WHERE singleton = TRUE AND claimed_by IS NOT NULL
       ) THEN
        RETURN 'already_registered';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_registration
        WHERE singleton = TRUE AND registration_code IS NOT NULL
          AND registration_code = p_code
    ) THEN
        RETURN 'invalid_code';
    END IF;
    RETURN 'available';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';
REVOKE ALL ON FUNCTION public.check_admin_registration_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_admin_registration_code(TEXT) TO anon, authenticated;

-- RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Consulta el rol sin volver a evaluar las políticas RLS de profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- Políticas para profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for authentication"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin());

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

CREATE TABLE public.attendance_periods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    starts_on DATE NOT NULL,
    ends_on DATE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CHECK (ends_on IS NULL OR ends_on >= starts_on),
    CHECK ((ends_on IS NULL) = (ended_at IS NULL))
);
CREATE UNIQUE INDEX idx_attendance_periods_single_open
    ON public.attendance_periods ((TRUE)) WHERE ended_at IS NULL;
ALTER TABLE public.attendance_periods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.attendance_periods FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.attendance_periods TO authenticated;

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
    USING (public.is_admin());

-- Admins pueden insertar/actualizar/eliminar cualquier asistencia
CREATE POLICY "Admins can manage all attendance"
    ON public.attendance FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can view attendance periods"
    ON public.attendance_periods FOR SELECT USING (public.is_admin());

-- Evita que un usuario cambie su propio rol desde la API.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND auth.uid() = NEW.id THEN
        NEW.role := 'practicante';
    ELSIF TG_OP = 'UPDATE' AND auth.uid() = OLD.id AND NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'No tienes permiso para cambiar tu rol';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trigger_protect_profile_role
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

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
DECLARE
    v_role TEXT := 'practicante';
    v_code TEXT;
    v_claimed BOOLEAN;
BEGIN
    IF NEW.raw_user_meta_data->>'role' = 'admin' THEN
        v_code := NEW.raw_user_meta_data->>'admin_registration_code';

        IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin')
           OR EXISTS (
               SELECT 1 FROM public.admin_registration
               WHERE singleton = TRUE AND claimed_by IS NOT NULL
           ) THEN
            RAISE EXCEPTION 'ADMIN_ALREADY_REGISTERED';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.admin_registration
            WHERE singleton = TRUE AND registration_code IS NOT NULL
              AND registration_code = v_code AND claimed_by IS NULL
        ) THEN
            RAISE EXCEPTION 'ADMIN_CODE_INVALID';
        END IF;

        UPDATE public.admin_registration
        SET registration_code = NULL, claimed_by = NEW.id
        WHERE singleton = TRUE
          AND claimed_by IS NULL
          AND registration_code IS NOT NULL
          AND registration_code = v_code;
        v_claimed := FOUND;
        IF NOT COALESCE(v_claimed, FALSE) THEN
            RAISE EXCEPTION 'ADMIN_ALREADY_REGISTERED';
        END IF;
        v_role := 'admin';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, institution, cycle_or_semester, shift, role)
    VALUES (
        NEW.id,
        lower(btrim(NEW.email)),
        NEW.raw_user_meta_data->>'full_name',
        CASE WHEN v_role = 'admin' THEN NULL ELSE NEW.raw_user_meta_data->>'institution' END,
        CASE WHEN v_role = 'admin' THEN NULL ELSE (NEW.raw_user_meta_data->>'cycle_or_semester')::INTEGER END,
        CASE WHEN v_role = 'admin' THEN NULL ELSE NEW.raw_user_meta_data->>'shift' END,
        v_role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil en signup
CREATE TRIGGER trigger_handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.attendance_period_status()
RETURNS TABLE (is_active BOOLEAN, starts_on DATE, ends_on DATE)
AS $$
    SELECT
        EXISTS (SELECT 1 FROM public.attendance_periods WHERE ended_at IS NULL),
        (SELECT p.starts_on FROM public.attendance_periods AS p ORDER BY p.started_at DESC LIMIT 1),
        (SELECT p.ends_on FROM public.attendance_periods AS p ORDER BY p.started_at DESC LIMIT 1);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.start_attendance_period()
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo el administrador puede iniciar las asistencias';
    END IF;
    IF EXISTS (SELECT 1 FROM public.attendance_periods WHERE ended_at IS NULL) THEN
        RAISE EXCEPTION 'Ya hay un periodo de asistencia activo';
    END IF;
    INSERT INTO public.attendance_periods (starts_on, created_by)
    VALUES (timezone('America/Lima', now())::date, auth.uid())
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.stop_attendance_period()
RETURNS VOID AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo el administrador puede cerrar las asistencias';
    END IF;
    UPDATE public.attendance_periods
    SET ends_on = timezone('America/Lima', now())::date, ended_at = now()
    WHERE ended_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay un periodo de asistencia activo';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.attendance_period_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_attendance_period() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.stop_attendance_period() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.attendance_period_status() FROM anon;
REVOKE ALL ON FUNCTION public.start_attendance_period() FROM anon;
REVOKE ALL ON FUNCTION public.stop_attendance_period() FROM anon;
GRANT EXECUTE ON FUNCTION public.attendance_period_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_attendance_period() TO authenticated;
GRANT EXECUTE ON FUNCTION public.stop_attendance_period() TO authenticated;

-- El servidor fija fecha/hora/estado y valida que corresponda al turno del perfil.
-- Se permite marcar antes del inicio solo a partir de la hora de apertura; después
-- de la hora límite se registra como tardanza para conservar el control de asistencia.
CREATE OR REPLACE FUNCTION public.prepare_attendance_checkin()
RETURNS TRIGGER AS $$
DECLARE
    v_now TIMESTAMP WITHOUT TIME ZONE := timezone('America/Lima', now());
    v_profile_shift TEXT;
    v_start TIME;
    v_window_end TIME;
BEGIN
    IF EXTRACT(ISODOW FROM v_now)::INTEGER > 5 THEN
        RAISE EXCEPTION 'No hay asistencias programadas los fines de semana';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.attendance_periods AS ap
        WHERE ap.ended_at IS NULL
          AND ap.starts_on <= timezone('America/Lima', now())::date
    ) THEN
        RAISE EXCEPTION 'El administrador todavía no ha iniciado las asistencias';
    END IF;

    SELECT p.shift INTO v_profile_shift
    FROM public.profiles AS p
    WHERE p.id = NEW.user_id;

    IF v_profile_shift IS NULL THEN
        RAISE EXCEPTION 'No se encontró el perfil del usuario';
    END IF;
    IF NEW.shift IS DISTINCT FROM v_profile_shift THEN
        RAISE EXCEPTION 'El turno no coincide con el turno asignado al perfil';
    END IF;

    IF NEW.shift = 'morning' THEN
        v_start := TIME '08:00';
        v_window_end := TIME '08:16';
    ELSE
        v_start := TIME '12:00';
        v_window_end := TIME '12:31';
    END IF;

    IF v_now::time < v_start OR v_now::time >= v_window_end THEN
        RAISE EXCEPTION 'La ventana de registro para este turno está cerrada';
    END IF;

    NEW.date := v_now::date;
    NEW.check_in_time := v_now::time;
    NEW.status := 'on_time';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trigger_prepare_attendance_checkin
    BEFORE INSERT ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.prepare_attendance_checkin();

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

-- Para habilitar el único registro admin, configura un código privado en SQL Editor:
-- UPDATE public.admin_registration
-- SET registration_code = 'PEGA_AQUI_UN_CODIGO_LARGO_PRIVADO'
-- WHERE singleton = TRUE AND claimed_by IS NULL;

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
