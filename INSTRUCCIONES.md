# Sistema de Gestión

Un sistema completo de gestión desarrollado con **Vite**, **React**, **TypeScript**, **Tailwind CSS**, **shadcn-ui** y **Supabase**.

## 🚀 Características

- ✅ **Autenticación segura** con Supabase
- ✅ **Dashboard moderno** con estadísticas en tiempo real
- ✅ **Menú lateral retraíble** con navegación intuitiva
- ✅ **Diseño responsive** y pixel perfect
- ✅ **UI/UX hermosa** con componentes de shadcn-ui
- ✅ **Totalmente en español**
- ✅ **Modo oscuro/claro** compatible

## 🛠️ Tecnologías Utilizadas

- **Vite** - Build tool ultra rápido
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Framework de CSS utilitario
- **shadcn-ui** - Componentes UI elegantes
- **Supabase** - Backend como servicio
- **Lucide React** - Iconos modernos

## ⚙️ Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configuración de Supabase

✅ **YA CONFIGURADO** - El proyecto ya está conectado con Supabase:

- **URL**: `https://masterd.gepdigital.ai`
- **Clave configurada**: Automáticamente incluida en el código

**Opcional**: Puedes crear un archivo `.env.local` para sobrescribir la configuración:

```env
VITE_SUPABASE_URL=https://masterd.gepdigital.ai
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
```

### 3. Configurar autenticación en Supabase

En tu proyecto de Supabase:
1. Ve a **Authentication > Settings**
2. Configura tu dominio y URLs de redirección
3. Habilita los proveedores de autenticación que desees

### 4. Ejecutar el proyecto

```bash
npm run dev
```

El proyecto estará disponible en `http://localhost:5173`

## 📱 Uso del Sistema

### Autenticación
- **Iniciar sesión**: Usa credenciales existentes de Supabase
- **Registro**: Los usuarios pueden registrarse directamente
- **Cerrar sesión**: Botón disponible en el menú lateral

### Dashboard
- **Estadísticas**: Visualización de métricas importantes
- **Actividad reciente**: Seguimiento de acciones del sistema
- **Acciones rápidas**: Accesos directos a funciones principales
- **Navegación**: Menú lateral completamente funcional

### Funcionalidades del Menú
- 🏠 **Dashboard** - Vista principal
- 👥 **Usuarios** - Gestión de usuarios
- 📊 **Reportes** - Generación de informes
- 📈 **Analíticas** - Métricas y estadísticas
- 📅 **Calendario** - Programación de eventos
- ⚙️ **Configuración** - Ajustes del sistema

## 🎨 Personalización

### Colores
Los colores se pueden personalizar editando las variables CSS en `src/index.css`:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96%;
  /* ... más variables */
}
```

### Componentes
Todos los componentes UI están en `src/components/ui/` y son completamente personalizables.

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── ui/                 # Componentes UI base
│   ├── LoginForm.tsx       # Formulario de login
│   ├── Dashboard.tsx       # Dashboard principal
│   └── Sidebar.tsx         # Menú lateral
├── contexts/
│   └── AuthContext.tsx     # Contexto de autenticación
├── lib/
│   ├── utils.ts           # Utilidades
│   └── supabase.ts        # Cliente de Supabase
└── main.tsx               # Punto de entrada
```

## 🚀 Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Despliega automáticamente

### Netlify

1. Build command: `npm run build`
2. Publish directory: `dist`
3. Configura las variables de entorno en el panel de Netlify

## 📞 Soporte

Si tienes alguna pregunta o necesitas ayuda:

1. Revisa la documentación de [Supabase](https://supabase.com/docs)
2. Consulta la documentación de [shadcn-ui](https://ui.shadcn.com)
3. Revisa los issues del proyecto en GitHub

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

¡Disfruta desarrollando con este sistema de gestión moderno y completo! 🎉 