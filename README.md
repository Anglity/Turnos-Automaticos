# Sistema de Turnos Automáticos - Guía Completa de Despliegue

## 🚀 GUÍA PASO A PASO DETALLADA

### REQUISITOS PREVIOS
- ✅ Node.js (versión 16 o superior) - [Descargar aquí](https://nodejs.org/)
- ✅ Nginx (solo para producción) - [Descargar aquí](https://nginx.org/en/download.html)
- ✅ Editor de texto (VS Code recomendado)

---

## 📋 PASO 1: PREPARAR EL PROYECTO

### 1.1 Abrir Terminal en la Carpeta del Proyecto
```bash
# Navegar a la carpeta (cambiar por tu ruta real)
cd "C:\Users\tu-usuario\Desktop\Turnos Automaticos"
```

### 1.2 Instalar Dependencias
```bash
# Ejecutar este comando y esperar a que termine
npm install
```
**⏱️ Tiempo estimado:** 2-3 minutos

---

## 📋 PASO 2: CONFIGURAR PARA ACCESO DESDE RED

### 2.1 Obtener tu IP Local
```bash
# En Windows - Ejecutar en CMD o PowerShell
ipconfig

# Buscar esta línea:
# IPv4 Address. . . . . . . . . . . : 192.168.1.XXX
# Anotar esa IP (ejemplo: 192.168.1.150)
```

### 2.2 Editar Configuración de Vite
**📁 Abrir archivo:** `vite.config.js`

**🔍 Buscar esta sección:**
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,        // LÍNEA A CAMBIAR
    host: 'localhost'  // LÍNEA A CAMBIAR
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

### 🏠 Dashboard
- Muestra turnos de la semana actual
- Estadísticas de colaboradores por nivel
- Estado de vacaciones activas

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
