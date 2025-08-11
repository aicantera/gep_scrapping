# Configuración del Logo

## Ubicación del Logo
El logo debe colocarse en: `src/assets/images/logo.jpg`

## Especificaciones Recomendadas
- **Formato**: JPG, PNG o SVG
- **Dimensiones**: 200x80px (relación 2.5:1) o similar
- **Tamaño de archivo**: Máximo 500KB
- **Fondo**: Preferiblemente transparente (para PNG/SVG)

## Cómo Activar el Logo

1. **Reemplazar el archivo placeholder**:
   - Elimina el archivo actual `src/assets/images/logo.jpg`
   - Coloca tu logo real con el nombre `logo.jpg` en la misma carpeta

2. **Activar en el código**:
   En el archivo `src/components/LoginForm.tsx`, busca la línea:
   ```jsx
   {/* Descomenta esta línea cuando tengas el logo real:
   <img src={logoImage} alt="Logo" className="w-20 h-20 object-contain" />
   */}
   ```
   
   Y descomenta la línea para activar la imagen:
   ```jsx
   <img src={logoImage} alt="Logo" className="w-20 h-20 object-contain" />
   ```

3. **Reactivar la importación**:
   En el mismo archivo, agrega la importación del logo:
   ```jsx
   import logoImage from '../assets/images/logo.jpg'
   ```

## Estado Actual
- ✅ Estructura de carpetas creada
- ✅ Placeholder del logo creado
- ✅ Código preparado para el logo
- ⏳ **Pendiente**: Reemplazar con logo real

## Notas
- El placeholder actual muestra "LOGO" en un cuadro azul con gradiente
- Una vez que coloques tu logo real, el diseño se ajustará automáticamente
- El logo se muestra centrado en la parte superior del login 