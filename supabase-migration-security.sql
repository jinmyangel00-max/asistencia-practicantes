-- Migración para proyectos que ya ejecutaron el esquema anterior.
-- Ejecutar una sola vez en Supabase SQL Editor.

-- Evita recursión RLS al comprobar el rol desde políticas sobre profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
CREATE POLICY "Admins can view all attendance"
    ON public.attendance FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance;
CREATE POLICY "Admins can manage all attendance"
    ON public.attendance FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Una sola cuenta admin. Si ya hay más de una, detener la migración para
-- que se elija primero cuál conservar como administradora.
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') > 1 THEN
        RAISE EXCEPTION 'Hay más de una cuenta admin. Deja solo una en profiles y vuelve a ejecutar esta migración.';
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_single_admin
    ON public.profiles (role) WHERE role = 'admin';

-- El código de alta no es legible ni modificable por clientes. Se consume
-- dentro del trigger de signup y solo puede reclamarlo un usuario.
CREATE TABLE IF NOT EXISTS public.admin_registration (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    registration_code TEXT,
    claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.admin_registration ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_registration FROM anon, authenticated;

INSERT INTO public.admin_registration (singleton, registration_code, claimed_by)
VALUES (
    TRUE,
    NULL,
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
)
ON CONFLICT (singleton) DO NOTHING;

-- Si el admin ya existía y la tabla se creó antes, marcarlo como el usuario
-- que ya reclamó el registro único.
UPDATE public.admin_registration
SET registration_code = NULL,
    claimed_by = (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
WHERE singleton = TRUE
  AND claimed_by IS NULL
  AND EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin');

-- La API de Auth convierte los errores del trigger en un mensaje genérico.
-- Esta función permite mostrar mensajes claros; el trigger vuelve a validar
-- y consume el código atómicamente, por lo que esta consulta no autoriza el alta.
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
        WHERE singleton = TRUE
          AND registration_code IS NOT NULL
          AND registration_code = p_code
    ) THEN
        RETURN 'invalid_code';
    END IF;

    RETURN 'available';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';
REVOKE ALL ON FUNCTION public.check_admin_registration_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_admin_registration_code(TEXT) TO anon, authenticated;

-- Evita duplicados ignorando mayúsculas y espacios en los perfiles.
DO $$
BEGIN
    IF EXISTS (
        SELECT lower(btrim(email))
        FROM public.profiles
        GROUP BY lower(btrim(email))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Hay correos repetidos en public.profiles; corrígelos antes de ejecutar esta migración.';
    END IF;
END;
$$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_normalized
    ON public.profiles (lower(btrim(email)));

-- Los perfiles admin no representan alumnos, por eso no requieren datos
-- académicos ni turno. Limpiar esos campos en admins ya existentes.
ALTER TABLE public.profiles ALTER COLUMN institution DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN cycle_or_semester DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN shift DROP NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_details_check;
UPDATE public.profiles
SET institution = NULL, cycle_or_semester = NULL, shift = NULL
WHERE role = 'admin';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_details_check CHECK (
    (role = 'admin' AND institution IS NULL AND cycle_or_semester IS NULL AND shift IS NULL)
    OR
    (role = 'practicante' AND institution IS NOT NULL AND cycle_or_semester IS NOT NULL AND shift IS NOT NULL)
);

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

DROP TRIGGER IF EXISTS trigger_protect_profile_role ON public.profiles;
CREATE TRIGGER trigger_protect_profile_role
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

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
            WHERE singleton = TRUE
              AND registration_code IS NOT NULL
              AND registration_code = v_code
              AND claimed_by IS NULL
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Periodos en que la institución habilita las asistencias. Solo el admin
-- puede iniciar o cerrar un periodo mediante las funciones siguientes.
CREATE TABLE IF NOT EXISTS public.attendance_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    starts_on DATE NOT NULL,
    ends_on DATE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CHECK (ends_on IS NULL OR ends_on >= starts_on),
    CHECK ((ends_on IS NULL) = (ended_at IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_periods_single_open
    ON public.attendance_periods ((TRUE)) WHERE ended_at IS NULL;
ALTER TABLE public.attendance_periods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.attendance_periods FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.attendance_periods TO authenticated;
DROP POLICY IF EXISTS "Admins can view attendance periods" ON public.attendance_periods;
CREATE POLICY "Admins can view attendance periods"
    ON public.attendance_periods FOR SELECT USING (public.is_admin());

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

DROP TRIGGER IF EXISTS trigger_prepare_attendance_checkin ON public.attendance;
CREATE TRIGGER trigger_prepare_attendance_checkin
    BEFORE INSERT ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.prepare_attendance_checkin();
