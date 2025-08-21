# 🚀 GEP AI - Sistema de Gestión Empresarial

**Versión 1.4.0** | Un CRM completo y moderno desarrollado con tecnologías de vanguardia

![Estado del Proyecto](https://img.shields.io/badge/Estado-Producción-brightgreen)
![Versión](https://img.shields.io/badge/Versión-1.4.0-blue)
![Usuarios Activos](https://img.shields.io/badge/Usuarios%20Activos-80-orange)
![Tecnología](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Tecnología](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Base de Datos](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase)

## 📋 Descripción

**GEP AI** es un sistema integral de gestión empresarial diseñado para optimizar la administración de clientes, empresas, documentos y usuarios. Con una interfaz moderna y herramientas avanzadas de análisis, reportes y automatización para empresas de todos los tamaños.

### 🎯 Características Principales

- Dashboard inteligente con métricas en tiempo real
- Gestión completa de clientes y empresas
- Sistema documental con alertas automáticas
- Gestión de usuarios con roles y permisos
- Organización y categorización de temas
- Panel de administración y diagnóstico
- Autenticación segura con Supabase Auth
- Interfaz responsive y modo oscuro/claro

## 🛠️ Stack Tecnológico

- **Frontend:** React 19, TypeScript 5.8, Vite 6.3, Tailwind CSS 3.4, React Router DOM 7.6
- **Backend & Base de Datos:** Supabase, PostgreSQL, Row Level Security (RLS)
- **UI:** shadcn/ui, Lucide React
- **Herramientas:** ESLint, PostCSS, Autoprefixer

## 🏗️ Arquitectura del Sistema

- Dashboard principal con métricas y actividad reciente
- Gestión de clientes y empresas
- Gestión documental y de alertas
- Gestión de usuarios y roles
- Gestión de temas y categorización

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js >= 18.0.0
- npm >= 8.0.0

### 1. Clonar el Repositorio
```bash
git clone [URL_DEL_REPOSITORIO]
cd sistema-gestion
```

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Configuración de Supabase
El proyecto está preconfigurado con Supabase. Puedes usar la configuración por defecto o crear tu archivo `.env.local`:
```env
VITE_SUPABASE_URL=https://masterd.gepdigital.ai
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
```

### 4. Configuración de Base de Datos
El sistema utiliza las siguientes tablas principales:
- `usuarios` - Gestión de usuarios y roles
- `clientes` - Base de datos de clientes
- `empresas` - Registro de empresas
- `senado` - Documentos y contenido
- `temas` - Categorización temática
- `alertas_directorio` - Sistema de alertas y notificaciones (NUEVO)

### 5. Iniciar el Proyecto
```bash
npm run dev
# El proyecto estará disponible en http://localhost:5173
```

## 📊 Funcionalidades Detalladas

### Dashboard Principal
- KPIs en tiempo real: documentos capturados, alertas enviadas, estadísticas de usuario
- Gráficos interactivos y monitor de actividad
- Accesos rápidos a módulos principales

### Gestión de Clientes
- CRUD completo de clientes
- Búsqueda avanzada y filtros
- Historial de interacciones y exportación de datos

### Gestión de Empresas
- Registro y administración de empresas
- Relaciones comerciales y análisis financiero
- Seguimiento de proyectos

### Gestión Documental
- Almacenamiento seguro de documentos
- Sistema de alertas y análisis de contenido
- Control de versiones

### Gestión de Alertas (NUEVO)
- Sistema completo de gestión de alertas con bandejas de trabajo
- Estados: Pendientes, Aprobadas, Enviadas, Rechazadas
- Validación y aprobación de alertas con campos editables
- Configuración de asunto y mensaje de correo
- Listas de distribución automáticas basadas en temas
- Exportación a Excel de alertas enviadas

### Gestión de Usuarios
- Administración de roles y perfiles
- Auditoría de actividad y configuración de acceso

### Ejecución de Bots
- Ejecución manual de bots de extracción (Diputados, Senado, DOF, CONAMER)
- Historial de ejecuciones con filtros y paginación

## 📁 Estructura del Proyecto

```
src/
├── components/                 # Componentes React
│   ├── ui/                    # Componentes base de UI
│   ├── AdminPanel.tsx         # Panel de administración
│   ├── AlertsManagement.tsx   # Gestión de alertas (NUEVO)
│   ├── ChartsSection.tsx      # Sección de gráficos
│   ├── ClientsManagement.tsx  # Gestión de clientes
│   ├── CompaniesManagement.tsx # Gestión de empresas
│   ├── Dashboard.tsx          # Dashboard principal
│   ├── DiagnosticPanel.tsx    # Panel de diagnóstico
│   ├── DocumentManagement.tsx # Gestión documental
│   ├── Header.tsx             # Encabezado
│   ├── LoginForm.tsx          # Formulario de login
│   ├── MetricsCards.tsx       # Tarjetas de métricas
│   ├── ProtectedRoute.tsx     # Rutas protegidas
│   ├── Sidebar.tsx            # Barra lateral
│   ├── ThemeManagement.tsx    # Gestión de temas
│   ├── UserManagement.tsx     # Gestión de usuarios
│   └── UsersTable.tsx         # Tabla de usuarios
├── contexts/
│   └── AuthContext.tsx        # Contexto de autenticación
├── lib/
│   ├── supabase.ts           # Cliente de Supabase
│   └── utils.ts              # Utilidades
├── assets/                   # Recursos estáticos
│   └── images/              # Imágenes y logos
├── App.tsx                  # Componente principal
├── main.tsx                 # Punto de entrada
└── index.css                # Estilos globales
```

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@gepdigital.ai
- Documentación: [Enlace a documentación]
- Issues: [GitHub Issues]

## 🔄 Historial de Cambios

### v1.4.0 (2024-12-19)
#### ✨ Nuevas Funcionalidades
- **Sistema de Gestión de Alertas**: Implementación completa del módulo de alertas
- **Bandejas de Trabajo**: Sistema de 4 bandejas (Pendientes, Aprobadas, Enviadas, Rechazadas)
- **Validación de Alertas**: Proceso de aprobación con campos editables
- **Configuración de Correos**: Campos para asunto y mensaje de correo
- **Listas de Distribución**: Cálculo automático basado en temas de clientes
- **Exportación a Excel**: Funcionalidad para exportar alertas enviadas

#### 🔧 Mejoras Técnicas
- **Normalización de Estados**: Sistema robusto de normalización de estados de alertas
- **Interfaz Responsive**: Diseño adaptativo para todas las pantallas
- **Filtros Avanzados**: Búsqueda por texto, fuente, fechas y estados
- **Paginación**: Sistema de paginación para grandes volúmenes de datos
- **Logs de Debug**: Sistema completo de logging para diagnóstico

#### 🐛 Correcciones
- **Corrección de Campos**: Ajuste de nombres de columnas en base de datos (`mensaje_email`)
- **Carga de Datos**: Solución a problemas de carga de alertas
- **Estados de Alerta**: Corrección en la gestión de estados "aprobado pendiente de envio"
- **Interfaz de Usuario**: Mejoras en la experiencia de usuario

#### 📊 Base de Datos
- **Nuevas Columnas**: `asunto_email`, `mensaje_email` en tabla `alertas_directorio`
- **Relaciones FK**: Mejoras en las relaciones entre tablas
- **Consultas Optimizadas**: Mejora en el rendimiento de consultas

---

**GEP AI v1.4.0** - Transformando la gestión empresarial con tecnología de vanguardia.
