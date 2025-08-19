# 🚀 GEP AI - Sistema de Gestión Empresarial aja2

**Versión 1.3.5** | Un CRM completo y moderno desarrollado con tecnologías de vanguardia

![Estado del Proyecto](https://img.shields.io/badge/Estado-Producción-brightgreen)
![Versión](https://img.shields.io/badge/Versión-1.3.5-blue)
![Usuarios Activos](https://img.shields.io/badge/Usuarios%20Activos-80-orange)
![Tecnología](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Tecnología](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Base de Datos](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase)

## 📋 Descripción

**GEP AI** es un sistema integral de gestión empresarial diseñado para optimizar la administración de clientes, empresas, documentos y usuarios. Con una interfaz moderna y intuitiva, ofrece herramientas avanzadas de análisis, reportes y automatización para empresas de todos los tamaños.

### 🎯 Características Principales

- ✅ **Dashboard Inteligente** - Métricas en tiempo real y KPIs personalizables
- ✅ **Gestión Completa de Clientes** - CRM avanzado con seguimiento de interacciones
- ✅ **Gestión Empresarial** - Administración de empresas y relaciones comerciales
- ✅ **Sistema Documental** - Gestión y almacenamiento de documentos con alertas automáticas
- ✅ **Gestión de Usuarios** - Control de acceso con roles y permisos granulares
- ✅ **Gestión de Temas** - Organización y categorización inteligente
- ✅ **Panel de Administración** - Herramientas avanzadas para administradores
- ✅ **Diagnóstico del Sistema** - Monitoreo de salud y conectividad
- ✅ **Autenticación Segura** - Sistema robusto con Supabase Auth
- ✅ **Interfaz Responsive** - Diseño adaptable a todos los dispositivos
- ✅ **Modo Oscuro/Claro** - Temas personalizables para mejor experiencia

## 🛠️ Stack Tecnológico

### Frontend
- **React 19** - Biblioteca de interfaz de usuario
- **TypeScript 5.8** - Tipado estático para mayor robustez
- **Vite 6.3** - Herramienta de construcción ultra-rápida
- **Tailwind CSS 3.4** - Framework CSS utilitario
- **React Router DOM 7.6** - Navegación SPA

### Backend & Base de Datos
- **Supabase** - Backend como servicio (BaaS)
- **PostgreSQL** - Base de datos relacional
- **Row Level Security (RLS)** - Seguridad a nivel de fila

### Componentes UI
- **shadcn/ui** - Componentes UI modernos y accesibles
- **Lucide React** - Iconografía moderna y consistente
- **Class Variance Authority** - Gestión de variantes de componentes

### Herramientas de Desarrollo
- **ESLint** - Linting de código
- **PostCSS** - Procesamiento de CSS
- **Autoprefixer** - Compatibilidad cross-browser

## 🏗️ Arquitectura del Sistema

### Estructura de Módulos

```
🏠 Dashboard Principal
├── 📊 Métricas en Tiempo Real
├── 📈 Gráficos Interactivos
├── 🔔 Alertas y Notificaciones
└── 📋 Actividad Reciente

👥 Gestión de Clientes
├── 📇 Base de Datos de Clientes
├── 🔄 Seguimiento de Interacciones
├── 📋 Historial de Actividades
└── 📊 Análisis de Comportamiento

🏢 Gestión de Empresas
├── 🏛️ Registro de Empresas
├── 🤝 Relaciones Comerciales
├── 📊 Análisis Empresarial
└── 📋 Historial de Transacciones

📄 Gestión Documental
├── 📁 Almacenamiento de Documentos
├── 🔍 Búsqueda Avanzada
├── 🚨 Sistema de Alertas
└── 📊 Análisis de Contenido

🔐 Gestión de Usuarios
├── 👤 Perfiles de Usuario
├── 🛡️ Roles y Permisos
├── 📊 Métricas de Actividad
└── 🔧 Configuración de Acceso

🎨 Gestión de Temas
├── 🏷️ Categorización
├── 🔗 Relaciones Temáticas
├── 📊 Análisis de Tendencias
└── 🔍 Búsqueda Semántica
```

### Sistema de Roles y Permisos

#### 👑 Administrador
- **Acceso Completo**: Todos los módulos y funcionalidades
- **Gestión de Usuarios**: Crear, editar, eliminar usuarios
- **Configuración del Sistema**: Ajustes globales y configuraciones
- **Panel de Diagnóstico**: Monitoreo de sistema y conectividad
- **Reportes Avanzados**: Acceso a todas las métricas y analytics

#### 📊 Analista GEP
- **Dashboard**: Visualización de métricas principales
- **Gestión de Clientes**: CRUD completo de clientes
- **Gestión de Empresas**: Administración de empresas
- **Gestión Documental**: Manejo de documentos y alertas
- **Gestión de Temas**: Organización temática

## 🚀 Instalación y Configuración

### Prerrequisitos

```bash
Node.js >= 18.0.0
npm >= 8.0.0
```

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

### 5. Iniciar el Proyecto

```bash
# Desarrollo
npm run dev

# El proyecto estará disponible en http://localhost:5173
```

## 📊 Funcionalidades Detalladas

### 🏠 Dashboard Principal

- **KPIs en Tiempo Real**: Documentos capturados, alertas enviadas, estadísticas de usuario
- **Gráficos Interactivos**: Visualización de datos por fuente y período
- **Monitor de Actividad**: Seguimiento de acciones recientes
- **Accesos Rápidos**: Navegación eficiente a módulos principales

### 👥 Gestión de Clientes

- **CRUD Completo**: Crear, leer, actualizar y eliminar clientes
- **Campos Personalizables**: Información detallada y categorización
- **Búsqueda Avanzada**: Filtros múltiples y búsqueda semántica
- **Historial de Interacciones**: Seguimiento completo de actividades
- **Exportación de Datos**: Reportes en múltiples formatos

### 🏢 Gestión de Empresas

- **Registro Empresarial**: Base de datos completa de empresas
- **Relaciones Comerciales**: Mapeo de conexiones y partnerships
- **Análisis Financiero**: Métricas y KPIs empresariales
- **Seguimiento de Proyectos**: Gestión de iniciativas y progreso

### 📄 Gestión Documental

- **Almacenamiento Seguro**: Repositorio centralizado de documentos
- **Sistema de Alertas**: Notificaciones automáticas basadas en contenido
- **Análisis de Contenido**: Procesamiento y categorización inteligente
- **Control de Versiones**: Historial y trazabilidad de cambios

### 🔐 Gestión de Usuarios

- **Administración de Roles**: Sistema granular de permisos
- **Perfiles Detallados**: Información completa de usuarios
- **Auditoría de Actividad**: Registro de acciones y sesiones
- **Configuración de Acceso**: Control de módulos y funcionalidades

### 🤖 Ejecución de Bots (Nuevo)

- Ejecución manual de bots de extracción (Diputados, Senado, DOF, CONAMER)
- Botón "Ejecutar ahora" con estado visual y deshabilitado durante la ejecución
- Notificaciones visuales al iniciar y finalizar ejecución
- **Historial de ejecuciones**:
  - Tabla con columnas: ID, Fuente, Fecha y hora, Tipo de ejecución, Ejecutado por, Estatus (color)
  - Filtros por fuente, fecha, tipo y estatus
  - Orden descendente por fecha
  - Paginación
  - Limpieza automática si se superan 1200 registros
- Envío del email del usuario logueado en el body del webhook al ejecutar un bot

### 🗄️ Estructura SQL sugerida para historial de ejecuciones (Supabase)

```sql
create table bot_executions (
  id serial primary key,
  fuente text not null, -- 'Cámara de Diputados', 'Senado', 'DOF', 'CONAMER'
  fecha timestamp with time zone not null default now(),
  tipo text not null, -- 'Manual' o 'Automática'
  ejecutado_por text, -- email o id del usuario (solo para manual)
  estatus text not null, -- 'éxito', 'falla', 'en proceso'
  detalles jsonb -- opcional: para logs o mensajes adicionales
);

create index idx_bot_executions_fecha_desc on bot_executions (fecha desc);
```

## 🎨 Personalización

### Temas y Colores

Los colores se pueden personalizar en `src/index.css`:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96%;
  --accent: 142.1 76.2% 36.3%;
  --destructive: 0 84.2% 60.2%;
  /* Personaliza según tus necesidades */
}
```

### Componentes UI

Todos los componentes están en `src/components/ui/` y son totalmente personalizables siguiendo los patrones de shadcn/ui.

## 🔧 Scripts Disponibles

```bash
# Desarrollo con hot reload
npm run dev

# Construcción para producción
npm run build

# Vista previa de la construcción
npm run preview

# Análisis de código (linting)
npm run lint
```

## 📁 Estructura del Proyecto

```
src/
├── components/                 # Componentes React
│   ├── ui/                    # Componentes base de UI
│   ├── AdminPanel.tsx         # Panel de administración
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

## 🌐 Despliegue

### Vercel (Recomendado)

```bash
# 1. Conectar repositorio a Vercel
# 2. Configurar variables de entorno:
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anon

# 3. Despliegue automático con cada push
```

### Netlify

```bash
# Build command: npm run build
# Publish directory: dist
# Configurar variables de entorno en el panel
```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview"]
```

## 📈 Métricas del Sistema

- **🏃‍♂️ Usuarios Activos**: 80 usuarios registrados
- **⚡ Performance**: Tiempo de carga < 2s
- **🔒 Seguridad**: Autenticación JWT + RLS
- **📱 Responsive**: Compatible con todos los dispositivos
- **🌐 Compatibilidad**: Chrome, Firefox, Safari, Edge

## 🔍 Diagnóstico y Monitoreo

El sistema incluye un panel de diagnóstico integrado que permite:

- **Pruebas de Conectividad**: Verificación de conexión con Supabase
- **Estado de Autenticación**: Validación del sistema de auth
- **Salud de la Base de Datos**: Monitoreo de conexiones y queries
- **Rendimiento del Sistema**: Métricas de performance en tiempo real

## 🤝 Contribución

### Proceso de Desarrollo

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Estándares de Código

- **TypeScript**: Tipado estricto obligatorio
- **ESLint**: Seguir reglas de linting configuradas
- **Componentes Funcionales**: Hooks y componentes funcionales únicamente
- **Documentación**: Comentarios JSDoc para funciones complejas

## 📞 Soporte y Contacto

### Recursos de Ayuda

- 📚 [Documentación de Supabase](https://supabase.com/docs)
- 🎨 [Documentación de shadcn/ui](https://ui.shadcn.com)
- ⚛️ [Documentación de React](https://react.dev)
- 📘 [Guía de TypeScript](https://www.typescriptlang.org/docs)

### Soporte Técnico

Para reportar bugs o solicitar nuevas funcionalidades:

1. Crear un issue en GitHub con plantilla correspondiente
2. Incluir pasos para reproducir el problema
3. Adjuntar logs y capturas de pantalla si es relevante

## 🔒 Seguridad

### Políticas de Seguridad

- **Autenticación JWT**: Tokens seguros con expiración
- **Row Level Security**: Políticas RLS en base de datos
- **Validación de Entrada**: Sanitización de datos del usuario
- **HTTPS**: Comunicación encriptada obligatoria
- **Roles Granulares**: Control de acceso por módulos

### Reportar Vulnerabilidades

Para reportar vulnerabilidades de seguridad, contacta directamente al equipo de desarrollo.

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**. Ver `LICENSE` para más detalles.

---

## 🎉 Agradecimientos

Desarrollado con ❤️ utilizando tecnologías modernas para ofrecer la mejor experiencia de gestión empresarial.

**GEP AI v1.3.5** - Transformando la gestión empresarial con tecnología de vanguardia.

## 🔄 Cambios Recientes

### v1.3.5 (Actual)
- Dashboard: Cambio de título del gráfico a "documentos recientes" (minúsculas).
- Dashboard: En el listado de documentos recientes se muestra ID (`id_senado_doc`) y Título (`iniciativa_texto`).
- Dashboard: Ajuste del texto "Mostrando documentos recientes" en la tabla.
- Dashboard: Mensaje de ejecución de bots sin la leyenda "(modo compatibilidad)".
- Login: Manejo de errores mejorado; ya muestra mensaje de contraseña incorrecta sin desaparecer por loading global.
- Sidebar: Actualización de versión visual a 1.3.5.

### v1.3.0
- **📊 Estadísticas de Cliente**: Corrección del cálculo de temas y subtemas - ahora muestra la cantidad real de elementos únicos asignados al cliente
- **✏️ Edición de Listas de Distribución**: Implementación completa de edición para listas existentes:
  - ✅ **Nombre editable**: Campo de texto para modificar nombres de listas
  - ✅ **Temas/Subtemas editables**: Selector jerárquico con checkboxes para agregar/quitar elementos
  - ✅ **Interfaz mejorada**: Botones de eliminación individual y vista organizada
- **🏷️ Terminología actualizada**: Cambio de "Total de temas suscritos" a "Total de temas/subtemas suscritos" para mayor precisión
- **🧹 Limpieza de interfaz**: Eliminación de etiquetas de debug en el dashboard cuando no hay documentos
- **🔐 Mejoras en navegación**:
  - ✅ **Sidebar optimizado**: Botón "Cerrar sesión" reposicionado justo después del menú principal (sin scroll)
  - ✅ **Header con dropdown**: Desplegable de usuario en la esquina superior derecha con opción de logout
  - ✅ **Mejor accesibilidad**: Dos formas de cerrar sesión para mayor comodidad

### v1.2.2
- **Gestión Documental**: Reordenamiento de columnas (ID, Proponente, Título, Fuente, etc.)
- **Gestión de Clientes**: Rediseño completo del formulario con sistema de listas de distribución
- **Dashboard**: Optimización de KPIs con datos del día actual
- **Login**: Actualización de textos ("Plataforma de Información Estratégica", "Correo")

### v1.2.1
- Implementación del módulo de Ejecución de Bots con historial
- Correcciones de diseño en Gestión de Clientes (eliminación de columnas innecesarias)
- Mejoras en la interfaz de usuario y validaciones

### v1.2.0
- Versión base del sistema con funcionalidades principales
- Dashboard con métricas básicas
- Gestión de documentos, clientes y usuarios

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Lucide React Icons
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Deployment**: Vercel/Netlify (recomendado)

## 📦 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone [url-del-repositorio]
   cd gep-cursor
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   Crear archivo `.env.local`:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

5. **Construir para producción**
   ```bash
   npm run build
   ```

## 🔧 Configuración de Supabase

1. Crear proyecto en [Supabase](https://supabase.com)
2. Configurar las tablas según la estructura descrita arriba
3. Configurar políticas RLS (Row Level Security)
4. Configurar autenticación con email/password
5. Configurar webhooks para bots (opcional)

## 📱 Características Responsive

- Diseño adaptativo para móviles, tablets y desktop
- Navegación optimizada para diferentes tamaños de pantalla
- Tablas con scroll horizontal en dispositivos móviles
- Modales y formularios adaptados a pantallas pequeñas

## 🔒 Seguridad

- Autenticación segura con Supabase Auth
- Control de acceso basado en roles
- Validación de datos en frontend y backend
- Protección contra inyección SQL
- HTTPS obligatorio en producción

## 📈 Métricas y Monitoreo

- Dashboard con KPIs en tiempo real
- Historial de ejecuciones de bots
- Logs de alertas y notificaciones
- Métricas de uso por usuario

## 🚀 Próximas Funcionalidades

- [ ] Reportes avanzados y exportación
- [ ] Notificaciones push en tiempo real
- [ ] API REST para integraciones externas
- [ ] Dashboard ejecutivo con más métricas
- [ ] Sistema de backup automático
- [ ] Integración con más fuentes de datos

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@gepdigital.ai
- Documentación: [Enlace a documentación]
- Issues: [GitHub Issues]

---

**GEP AI** - Plataforma de Información Estratégica v1.3.0

# Cambios recientes en la gestión de Temas y Subtemas

- Al editar un tema, puedes ver y gestionar (agregar, editar, eliminar) los subtemas asociados directamente desde la vista de edición.
- Al crear un tema, después de guardar, puedes agregar subtemas asociados sin salir del flujo.
- Ya no existe la columna de subtemas en la tabla/listado principal de temas. La gestión de subtemas es solo desde la edición/creación de tema.

## Flujo actualizado
1. Edita o crea un tema.
2. Gestiona los subtemas asociados desde la misma pantalla.
3. Los subtemas pueden editarse o eliminarse individualmente.
