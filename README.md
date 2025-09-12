# Turnos Automáticos — Despliegue en servidor (Producción)

Guía mínima y directa para desplegar la aplicación en un servidor Linux con Nginx (recomendado para una SPA estática).

Requisitos
- Node.js y npm (solo en la máquina de compilación).
- Acceso SSH al servidor donde se servirá la aplicación.
- Nginx instalado en el servidor.

1) Construir (máquina de compilación o local)

```powershell
npm ci
# exportar variables necesarias para el build (ejemplo)
$env:VITE_API_URL='https://api.tu-dominio.com'
npm run build
```

Salida: carpeta `dist/` con los ficheros estáticos listos para desplegar.

2) Copiar `dist/` al servidor

```powershell
rsync -a --delete dist/ user@server:/var/www/turnos-automaticos/
ssh user@server 'sudo chown -R www-data:www-data /var/www/turnos-automaticos && sudo chmod -R 755 /var/www/turnos-automaticos'
```

(Si no dispone de rsync, usar `scp -r dist/ user@server:/var/www/turnos-automaticos/`.)

3) Configuración mínima de Nginx para SPA

Crear un archivo de sitio, por ejemplo `/etc/nginx/sites-available/turnos`: 

```
server {
    listen 80;
    server_name tu-dominio.com;

    root /var/www/turnos-automaticos;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Activar el sitio y recargar Nginx:

```powershell
ssh user@server 'sudo ln -s /etc/nginx/sites-available/turnos /etc/nginx/sites-enabled/ || true'
ssh user@server 'sudo nginx -t && sudo systemctl reload nginx'
```

4) Verificación
- Abrir el dominio en el navegador y comprobar que la aplicación carga y las rutas funcionan.
- Revisar la consola del navegador para errores (CORS, 404 de recursos).

Notas
- No use `npm run dev` en producción; es solo para desarrollo.
- Este flujo asume que la compilación se hace en una máquina segura (CI o local) y solo se transfieren los assets estáticos al servidor.

Seguridad y comportamiento por defecto
- La inicialización automática de datos y la limpieza automática están desactivadas por seguridad en el servicio Firebase local.
- Si deseas activar la limpieza automática manualmente, llama al método `activarLimpiezaAutomatica()` expuesto en el servicio (`src/services/firebaseService.js`).

---

Instrucciones enfocadas exclusivamente en desplegar la aplicación en un servidor con Nginx.
