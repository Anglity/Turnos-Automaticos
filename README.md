# Sistema de Turnos Automáticos BANFONDESA 🔄

Sistema web para gestión automatizada de turnos de guardia con rotación inteligente, gestión de colaboradores y manejo de vacaciones.

## ✨ Características

- � **Dashboard Intuitivo**: Vista general del estado actual de turnos
- 👥 **Gestión de Colaboradores**: CRUD completo con información de contacto y niveles
- 🏖️ **Gestión de Vacaciones**: Control de ausencias con validaciones automáticas
- 🔄 **Turnos Automatizados**: Generación automática con rotación por grupos y niveles
- ☁️ **Almacenamiento en la Nube**: Persistencia con Firebase Firestore
- 🎨 **Interfaz Moderna**: Diseño responsivo con React y CSS moderno

## 🚀 REQUISITOS PREVIOS

- ✅ Node.js (versión 16 o superior) - [Descargar aquí](https://nodejs.org/)
- ✅ Cuenta de Firebase - [Crear cuenta](https://console.firebase.google.com/)
- ✅ Editor de código (VS Code recomendado)

---

## 📋 INSTALACIÓN Y CONFIGURACIÓN

### 1. Clonar o Descargar el Proyecto
```bash
# Navegar a la carpeta del proyecto
cd "C:\ruta\a\tu\proyecto\Turnos Automaticos"
```

### 2. Instalar Dependencias
```bash
# Instalar todas las dependencias necesarias
npm install
```
**⏱️ Tiempo estimado:** 2-3 minutos

### 3. Configurar Firebase
1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear un nuevo proyecto llamado "turnos-automaticos"
3. Activar Firestore Database en modo de prueba
4. Registrar una aplicación web
5. Copiar las credenciales de configuración

### 4. Actualizar Credenciales
Editar `src/services/firebaseConfig.js` con tus credenciales reales:

```javascript
const firebaseConfig = {
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "tu-app-id"
};
```

---

## � EJECUCIÓN

### Modo Desarrollo
```bash
# Ejecutar servidor de desarrollo
npm run dev
```
La aplicación se abrirá en: `http://localhost:3000`

### Acceso desde Red Local
Si quieres que otros dispositivos en tu red local puedan acceder:

1. Editar `vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0'  // Permite acceso desde red
  }
})
```

2. Obtener tu IP local:
```bash
# Windows
ipconfig

# Buscar: IPv4 Address. . . . . . . . . . . : 192.168.1.XXX
```

3. Otros dispositivos pueden acceder en: `http://TU-IP:3000`

---

## 📊 ESTRUCTURA DEL PROYECTO

```
src/
├── components/           # Componentes React
│   ├── Dashboard.jsx    # Página principal
│   ├── GenerarTurnos.jsx# Generación automática de turnos
│   ├── GestionColaboradores.jsx  # CRUD colaboradores
│   ├── GestionVacaciones.jsx     # Gestión de vacaciones
│   └── ...
├── services/            # Servicios de datos
│   ├── firebaseConfig.js      # Configuración Firebase
│   ├── firebaseService.js     # Servicio principal de datos
│   └── turnosServiceFirebase.js # Interface de turnos
└── utils/               # Utilidades
    └── fechas.js        # Funciones para fechas
```

---

## �️ FUNCIONALIDADES

### Dashboard
- Vista general del sistema
- Estado actual de turnos
- Colaboradores activos
- Próximas vacaciones

### Gestión de Colaboradores
- ➕ Agregar nuevos colaboradores
- ✏️ Editar información existente
- 🗑️ Eliminar colaboradores
- 📱 Información de contacto completa
- 🏷️ Asignación de grupos y niveles

### Gestión de Vacaciones
- 📅 Programar períodos de vacaciones
- ✅ Validaciones automáticas de fechas
- 🔍 Búsqueda y filtrado
- 📊 Vista de calendar de ausencias

### Generación de Turnos
- 🤖 Algoritmo inteligente de rotación
- 👨‍💼 Respeta jerarquías y niveles
- 🏖️ Considera vacaciones automáticamente
- 📋 Genera horarios semanales completos

---

## 💾 DATOS Y PERSISTENCIA

- **Firebase Firestore**: Base de datos en la nube
- **Inicialización Automática**: Datos base se crean automáticamente
- **Limpieza Automática**: Registros antiguos se eliminan periódicamente
- **Respaldo en Tiempo Real**: Sincronización instantánea

---

## 🔧 CONFIGURACIÓN AVANZADA

### Variables de Entorno (Opcional)
Crear archivo `.env` en la raíz:
```env
VITE_FIREBASE_API_KEY=tu-api-key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Error: Firebase no está configurado
- ✅ Verificar que las credenciales en `firebaseConfig.js` sean correctas
- ✅ Confirmar que Firestore esté activado en Firebase Console
- ✅ Verificar que las reglas de Firestore permitan lectura/escritura

### Error: Puerto en uso
```bash
# Si el puerto 3000 está ocupado, usar otro:
npm run dev -- --port 3001
```

### Error: No se pueden agregar datos
- ✅ Verificar conexión a internet
- ✅ Revisar reglas de Firestore
- ✅ Confirmar que el proyecto de Firebase esté activo

### Limpiar caché del navegador
```bash
# Ctrl + Shift + R (Windows/Linux)
# Cmd + Shift + R (Mac)
```

---

## 📞 SOPORTE TÉCNICO

### Información del Proyecto
- **Versión**: 1.0.0
- **Tecnología**: React + Vite + Firebase
- **Compatibilidad**: Navegadores modernos (Chrome, Firefox, Safari, Edge)
- **Responsivo**: ✅ Funciona en móviles y tablets

### Contacto para Soporte
- **Sistema**: Turnos Automáticos BANFONDESA
- **Desarrollado para**: Departamento de TI
- **Última actualización**: Septiembre 2025

---

## 📝 LICENCIA Y USO

Este sistema fue desarrollado específicamente para BANFONDESA y su uso está restringido para operaciones internas de la institución.

### Características del Sistema
- ✅ **Altamente Confiable**: Persistencia en la nube con respaldo automático
- ✅ **Escalable**: Soporta crecimiento de usuarios y datos
- ✅ **Intuitivo**: Interfaz fácil de usar para todo el personal
- ✅ **Automatizado**: Reduce errores manuales en la asignación de turnos
- ✅ **Trazable**: Historial completo de cambios y asignaciones

---

## 🎯 PRÓXIMAS FUNCIONALIDADES

- [ ] Sistema de notificaciones por email
- [ ] Integración con calendario de Outlook
- [ ] Reportes avanzados en PDF/Excel
- [ ] Aplicación móvil nativa
- [ ] Sistema de autenticación avanzado

---

**¡Listo para usar! 🚀**
  }
})
```

**✏️ Cambiar por:**
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3020,        // 🔧 CAMBIAR: Puerto que quieras usar
    host: '0.0.0.0'    // 🔧 CAMBIAR: Para permitir acceso desde red
  }
})
```

**💾 Guardar el archivo** (Ctrl + S)

---

## 📋 PASO 3: EJECUTAR EN MODO DESARROLLO

### 3.1 Iniciar el Servidor
```bash
# En la terminal, ejecutar:
npm run dev
```

**✅ Si todo está bien, verás algo como:**
```
  VITE v5.4.1  ready in 234 ms

  ➜  Local:   http://localhost:3020/
  ➜  Network: http://192.168.1.150:3020/
  ➜  press h + enter to show help
```

### 3.2 Probar Acceso
- **Desde tu PC:** Abre `http://localhost:3020`
- **Desde otra PC en la misma red:** Abre `http://TU_IP:3020` (ejemplo: `http://192.168.1.150:3020`)

**🚨 Si no funciona desde otra PC:**
1. Verificar que ambas PCs estén en la misma red WiFi
2. Desactivar firewall temporalmente para probar
3. Confirmar que el puerto 3020 esté abierto

---

## 📋 PASO 4: DESPLIEGUE EN PRODUCCIÓN (OPCIONAL)

### 4.1 Construir la Aplicación para Producción
```bash
# Detener el servidor de desarrollo (Ctrl + C)
# Luego ejecutar:
npm run build
```

**📁 Esto creará una carpeta `dist/` con todos los archivos optimizados**

### 4.2 Configurar Nginx para Servir la Aplicación

#### A) Editar Configuración de Nginx
**📁 Abrir archivo:** `nginx.conf`

**🔍 Contenido actual:**
```nginx
server {
    listen 80;
    server_name 192.168.1.100;  # Cambia por la IP de tu servidor
    
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**✏️ Cambiar la línea:**
```nginx
server_name 192.168.1.150;  # 🔧 PONER TU IP REAL AQUÍ
```

#### B) Copiar Archivos al Servidor

**En Linux/Ubuntu:**
```bash
# Copiar archivos de dist/ al servidor web
sudo cp -r dist/* /var/www/html/

# Dar permisos correctos
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/
```

**En Windows (con Nginx instalado):**
1. Localizar la carpeta de instalación de Nginx (ejemplo: `C:\nginx\html\`)
2. Copiar TODO el contenido de la carpeta `dist\` 
3. Pegarlo en la carpeta `html\` de Nginx

#### C) Iniciar/Reiniciar Nginx

**En Linux:**
```bash
# Verificar configuración
sudo nginx -t

# Si está OK, reiniciar
sudo systemctl restart nginx

# Verificar estado
sudo systemctl status nginx
```

**En Windows:**
1. Abrir "Servicios" (services.msc)
2. Buscar "nginx"
3. Clic derecho → Reiniciar

### 4.3 Probar el Despliegue
- **Abrir navegador:** `http://TU_IP_DEL_SERVIDOR`
- **Ejemplo:** `http://192.168.1.150`

---

## 🔧 CONFIGURACIONES DETALLADAS

### Puerto Personalizado
Si quieres cambiar el puerto 3020 por otro:

1. **Editar `vite.config.js`:**
   ```javascript
   port: 8080,  // Cambiar por el puerto deseado
   ```

2. **Abrir el puerto en Windows Firewall:**
   ```bash
   netsh advfirewall firewall add rule name="Turnos App" dir=in action=allow protocol=TCP localport=8080
   ```

### IP Específica (En lugar de 0.0.0.0)
Si quieres que solo una IP específica pueda acceder:

**Editar `vite.config.js`:**
```javascript
host: '192.168.1.150'  // Solo esta IP puede acceder
```

---

## 🚨 SOLUCIÓN DE PROBLEMAS PASO A PASO

### ❌ Error: "Puerto ocupado"
1. **Ver qué proceso usa el puerto:**
   ```bash
   netstat -ano | findstr :3020
   ```
2. **Matar el proceso:**
   ```bash
   taskkill /PID [NUMERO_PID] /F
   ```
3. **O cambiar puerto en vite.config.js**

### ❌ No se puede acceder desde otra PC
1. **Verificar configuración en vite.config.js:**
   - ✅ `host: '0.0.0.0'`
   - ✅ Puerto correcto

2. **Probar ping desde la otra PC:**
   ```bash
   ping 192.168.1.150
   ```

3. **Desactivar firewall temporalmente:**
   - Panel de Control → Sistema y Seguridad → Firewall de Windows
   - "Activar o desactivar Firewall"
   - Desactivar temporalmente para probar

4. **Abrir puerto específico:**
   ```bash
   netsh advfirewall firewall add rule name="Turnos App" dir=in action=allow protocol=TCP localport=3020
   ```

### ❌ Error en npm install
1. **Limpiar caché:**
   ```bash
   npm cache clean --force
   ```
2. **Intentar de nuevo:**
   ```bash
   npm install
   ```

### ❌ Nginx no encuentra archivos
1. **Verificar ruta en nginx.conf:**
   - Linux: `/var/www/html`
   - Windows: `C:\nginx\html`

2. **Verificar que index.html existe en la ruta**

3. **Revisar logs de Nginx:**
   ```bash
   # Linux
   sudo tail -f /var/log/nginx/error.log
   
   # Windows
   # Ver archivo de logs en carpeta de Nginx
   ```

---

## 📱 CARACTERÍSTICAS DE LA APLICACIÓN

### 🔒 **PROTECCIÓN AUTOMÁTICA DE DATOS**
- ✅ **Los datos NO se pierden** al cambiar puerto o IP
- ✅ **Migración automática** desde configuraciones anteriores
- ✅ **Verificación de integridad** y restauración automática
- ✅ **Clave única del proyecto** independiente del navegador

### 💾 **Cómo Funciona la Persistencia:**
1. **Primera vez:** Usa datos del archivo JSON original
2. **Cambios:** Se guardan automáticamente con clave única
3. **Cambio de puerto/IP:** Migra automáticamente los datos
4. **Datos corruptos:** Se restauran automáticamente

### 🏠 Dashboard
- Muestra turnos de la semana actual
- Estadísticas de colaboradores por nivel
- Estado de vacaciones activas
- **Indicador de datos protegidos**

### 📅 Generar Turnos
- Seleccionar cualquier fecha
- Ver turnos para esa semana específica
- Incluye reemplazos por vacaciones

### 👥 Gestión de Colaboradores
- Agregar nuevos colaboradores
- Editar información existente
- Asignar niveles y grupos

### 🏖️ Gestión de Vacaciones
- Programar fechas de vacaciones
- Ver reemplazos automáticos
- Gestionar ausencias por fecha

---

## 📞 CONTACTO Y SOPORTE

**En caso de problemas:**
1. Revisar la sección "Solución de Problemas" arriba
2. Verificar que todos los pasos se siguieron correctamente
3. Asegurarse de tener las versiones correctas de Node.js y Nginx

**Versión del Sistema:** 1.0.0  
**Tecnologías:** React + Vite + Nginx  
**Compatibilidad:** Windows, Linux, macOS
