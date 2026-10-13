# Sistema de Asistencia de Practicantes - JP

Sistema moderno de control de asistencia para practicantes de **UCV** (ciclos 1-10) y **SENATI** (semestres 1-6) en Institución Educativa.

## 🚀 Características

- **Autenticación segura** con Supabase Auth (email/password)
- **Registro de asistencia por turnos** con validación de horarios:
  - Turno Mañana: 08:00 - 08:15
  - Turno Tarde: 12:00 - 12:30
- **Panel de practicante**: Auto check-in, historial personal, resumen semanal
- **Panel de administración** (`/admin`): Vista global, filtros, exportación CSV
- **Diseño responsivo** con Tailwind CSS + colores institucionales (azul oscuro + dorado)
- **Zona horaria Perú (UTC-5)** manejada en frontend

## 🛠 Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **Icons**: Lucide React
- **Utils**: date-fns, clsx, tailwind-merge

## 📦 Instalación

```bash
# Clonar e instalar dependencias
cd asistencia-practicantes
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Ejecutar en desarrollo
npm run dev
```

## ⚙️ Configuración de Supabase

1. **Crear proyecto** en [supabase.com](https://supabase.com)
2. **Ejecutar esquema SQL**: En un proyecto nuevo, copia `supabase-schema.sql` en el SQL Editor de Supabase. Para actualizar un proyecto existente, aplica la migración `supabase-migration-security.sql`.
3. **Configurar Auth**:
   - Authentication > Settings > Email Auth
   - Site URL: `http://localhost:5173` (dev)
   - Redirect URLs: `http://localhost:5173/**`
4. **Obtener credenciales**: Settings > API > Project URL & anon public key
5. **Actualizar `.env`** con tus valores

## 🗄 Esquema de Base de Datos

### Tabla `profiles`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK, referencia auth.users |
| email | TEXT | Email del usuario |
| full_name | TEXT | Nombre completo |
| institution | TEXT | 'UCV' o 'SENATI' |
| cycle_or_semester | INTEGER | 1-10 (UCV) o 1-6 (SENATI) |
| shift | TEXT | 'morning' o 'afternoon' |
| role | TEXT | 'practicante' o 'admin' |

### Tabla `attendance`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK a profiles |
| date | DATE | Fecha de asistencia |
| check_in_time | TIME | Hora de entrada |
| shift | TEXT | 'morning' o 'afternoon' |
| status | TEXT | 'on_time' o 'late' |

**Constraint único**: `(user_id, date, shift)` - Un registro por turno por día

### Row Level Security (RLS)
- Usuarios ven solo sus datos
- Admins (role='admin') ven todo
- Políticas automáticas via triggers
- El rol no se puede cambiar desde la sesión del propio usuario; el alta siempre crea practicantes
- La base de datos asigna fecha, hora y estado del check-in usando la hora de Perú y verifica el turno del perfil

## 🎨 Paleta de Colores

```css
/* Azul oscuro institucional */
--primary-800: #1e3a5f;
--primary-900: #172a45;

/* Dorado/Amarillo */
--gold-500: #f59e0b;
--gold-400: #fbbf24;
```

## 📱 Páginas

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Landing page | Público |
| `/login` | Iniciar sesión | Invitados |
| `/register` | Crear cuenta | Invitados |
| `/dashboard` | Panel practicante | Autenticado |
| `/admin` | Panel admin | Autenticado |

## 🔐 Flujo de Usuario

1. **Registro**: Completa nombre, email, contraseña, institución, ciclo/semestre, turno
2. **Login**: Accede con credenciales
3. **Dashboard**: Ve horarios disponibles y registra entrada; después de la hora límite, el sistema la marca como tardanza
4. **Historial**: Revisa asistencias pasadas y resumen semanal

## 👨‍💼 Panel Admin (`/admin`)

- Vista de todos los registros con paginación virtual
- Filtros: Fecha/Rango, Institución, Turno, Estado, Búsqueda
- Estadísticas en tiempo real
- Exportación a CSV
- Responsive (mobile-first)

## 🌐 Despliegue

### Vercel (Recomendado)
```bash
npm run build
# Conectar repo a Vercel
# Configurar variables de entorno en Vercel
```

### Netlify
```bash
npm run build
# Build command: npm run build
# Publish directory: dist
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── ui/           # Componentes base (Button, Input, Card, etc.)
│   └── layout/       # Header, Footer, Layouts
├── context/
│   ├── AuthContext.tsx      # Autenticación Supabase
│   └── AttendanceContext.tsx # Gestión de asistencia
├── lib/
│   ├── supabase.ts  # Cliente Supabase + tipos
│   └── utils.ts     # Helpers fecha/hora, validaciones
├── pages/
│   ├── Home.tsx     # Landing
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   └── Admin.tsx
├── App.tsx          # Rutas + providers
└── main.tsx         # Entry point
```

## 🔧 Scripts Disponibles

```bash
npm run dev      # Servidor desarrollo
npm run build    # Build producción
npm run preview  # Preview build local
npm run lint     # ESLint
```

## 📝 Licencia

Desarrollado para Institución Educativa JP - Uso interno.

---

**¿Preguntas?** Revisa `supabase-schema.sql` para detalles de BD o abre un issue.
