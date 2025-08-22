# Mejoras en el Manejo de Sesiones - Sistema GEP

## Resumen de Cambios Implementados

Se han implementado mejoras significativas en el sistema de manejo de sesiones para garantizar que:

1. **El perfil de usuario NO cambie durante la navegación**
2. **La sesión solo se cierre después de 30 minutos de inactividad**
3. **El usuario sea notificado cuando la sesión esté próxima a expirar**

## Cambios Principales

### 1. AuthContext Mejorado (`src/contexts/AuthContext.tsx`)

#### Nuevas Funcionalidades:
- **Timeout de sesión configurado a 30 minutos**
- **Cache de información del usuario** para evitar consultas repetidas a la base de datos
- **Monitoreo de actividad del usuario** en tiempo real
- **Detectores de actividad**: mouse, teclado, scroll, touch
- **Limpieza automática de recursos** al cerrar sesión

#### Configuración de Timeouts:
```typescript
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutos
const ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000 // Verificación cada 5 minutos
```

#### Eventos de Actividad Monitoreados:
- `mousedown`
- `mousemove` 
- `keypress`
- `scroll`
- `touchstart`
- `click`

### 2. Componente SessionTimer (`src/components/SessionTimer.tsx`)

#### Funcionalidades:
- **Visualización del tiempo restante** de sesión en formato MM:SS
- **Cambio de color según el tiempo restante**:
  - Verde: Tiempo normal
  - Amarillo: 5 minutos o menos
  - Rojo: 2 minutos o menos
- **Reinicio automático** del timer con actividad del usuario
- **Integrado en el Sidebar** para visibilidad constante

### 3. Componente SessionWarning (`src/components/SessionWarning.tsx`)

#### Funcionalidades:
- **Notificación emergente** cuando quedan 5 minutos o menos
- **Opciones para el usuario**:
  - "Mantener sesión": Extiende la sesión
  - "Cerrar sesión": Cierra la sesión manualmente
- **Posicionamiento fijo** en la esquina superior derecha
- **Diseño responsivo** y accesible

### 4. Integración en Sidebar (`src/components/Sidebar.tsx`)

#### Mejoras:
- **Timer de sesión visible** en el perfil del usuario
- **Información del rol persistente** durante toda la sesión
- **Indicadores visuales** del estado de la sesión

## Beneficios Implementados

### 1. Persistencia del Perfil de Usuario
- ✅ El rol de usuario se mantiene durante toda la sesión
- ✅ Cache de información evita consultas innecesarias
- ✅ No hay cambios de perfil durante la navegación

### 2. Timeout de Sesión Configurado
- ✅ Sesión expira exactamente a los 30 minutos de inactividad
- ✅ Monitoreo continuo de actividad del usuario
- ✅ Cierre automático de sesión al expirar

### 3. Experiencia de Usuario Mejorada
- ✅ Notificaciones proactivas antes de la expiración
- ✅ Opciones claras para extender o cerrar sesión
- ✅ Indicadores visuales del tiempo restante
- ✅ Reinicio automático del timer con actividad

### 4. Seguridad y Rendimiento
- ✅ Limpieza automática de recursos
- ✅ Manejo robusto de errores
- ✅ Cache inteligente de datos de usuario
- ✅ Prevención de fugas de memoria

## Configuración Técnica

### Variables de Entorno Recomendadas:
```env
# Tiempo de sesión en minutos (opcional, por defecto 30)
SESSION_TIMEOUT_MINUTES=30

# Intervalo de verificación en minutos (opcional, por defecto 5)
ACTIVITY_CHECK_INTERVAL_MINUTES=5
```

### Eventos de Actividad Configurados:
El sistema detecta automáticamente cuando el usuario está activo mediante:
- Movimientos del mouse
- Pulsaciones de teclado
- Scroll de página
- Clicks en elementos
- Eventos táctiles (para dispositivos móviles)

## Comportamiento Esperado

### Para Usuarios Administradores:
1. Inicia sesión como Administrador
2. Navega por diferentes módulos
3. El perfil permanece como "Administrador" durante toda la sesión
4. Recibe notificación a los 25 minutos de inactividad
5. Sesión expira automáticamente a los 30 minutos sin actividad

### Para Usuarios Analistas:
1. Inicia sesión como Analista GEP
2. Navega por módulos permitidos
3. El perfil permanece como "Analista GEP" durante toda la sesión
4. Recibe notificación a los 25 minutos de inactividad
5. Sesión expira automáticamente a los 30 minutos sin actividad

## Monitoreo y Logs

El sistema incluye logs detallados para monitoreo:
- `👁️ Monitoreo de actividad iniciado`
- `⏰ Sesión expirada por inactividad (30 minutos)`
- `🔒 Cerrando sesión por expiración de timeout`
- `📋 Usando información cacheada para: [email]`

## Pruebas Recomendadas

1. **Prueba de Persistencia de Rol**:
   - Iniciar sesión como admin
   - Navegar entre módulos
   - Verificar que el rol no cambie

2. **Prueba de Timeout**:
   - Iniciar sesión
   - No interactuar con el sistema
   - Verificar que expire a los 30 minutos

3. **Prueba de Notificaciones**:
   - Iniciar sesión
   - Esperar hasta que aparezca la advertencia
   - Probar botones de "Mantener sesión" y "Cerrar sesión"

4. **Prueba de Reinicio de Timer**:
   - Iniciar sesión
   - Esperar hasta que aparezca la advertencia
   - Hacer clic en cualquier lugar
   - Verificar que el timer se reinicie

## Consideraciones de Mantenimiento

- Los timeouts se pueden ajustar modificando las constantes en `AuthContext.tsx`
- El cache de usuario se limpia automáticamente al cerrar sesión
- Los listeners de actividad se limpian automáticamente para evitar fugas de memoria
- El sistema es compatible con dispositivos móviles y de escritorio
