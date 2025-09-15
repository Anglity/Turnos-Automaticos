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

Sección: Actualizar `semanaActual` automáticamente
-----------------------------------------------

Se agregó un script de línea de comandos que calcula la "semana de rotación" (usando la lógica del proyecto) y actualiza el documento `configuracion/general` en Firestore.

Ubicación: `scripts/updateSemanaActual.mjs`

Uso local (modo prueba, no toca Firebase):

```powershell
node ./scripts/updateSemanaActual.mjs --dry
```

Uso en producción (requiere credenciales de servicio de Firebase):

1. Crear una cuenta de servicio en la consola de Firebase y descargar el JSON de credenciales.
2. En el servidor donde se ejecutará el script, exportar la variable de entorno `GOOGLE_APPLICATION_CREDENTIALS` apuntando al JSON:

```powershell
#$env:GOOGLE_APPLICATION_CREDENTIALS='C:\path\to\serviceAccountKey.json'  # PowerShell
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json # bash
```

3. Ejecutar:

```powershell
npm run update:semana
```

Programar ejecución semanal (ejemplos):

- Linux (cron, cada lunes 00:05):

```
5 0 * * 1 cd /path/to/Turnos\ Automaticos && /usr/bin/node ./scripts/updateSemanaActual.mjs
```

- Windows (Task Scheduler): crear tarea que ejecute `node` con argumento `C:\path\to\Turnos Automaticos\scripts\updateSemanaActual.mjs` cada lunes 00:05.

Notas y recomendaciones
- El script intenta usar `firebase-admin` para actualizar Firestore. Asegúrate de instalar dependencias en el servidor (`npm ci`) y de proporcionar las credenciales.
- Antes de programar, prueba con `--dry` para validar el número de semana calculado.
- Asegúrate de que el documento `configuracion/general` existe; si no, el script creará/mergeará el campo `semanaActual`.

Automatizar con GitHub Actions
--------------------------------

Si mantienes este repositorio en GitHub, puedes programar la ejecución semanal sin necesidad de un servidor propio.

1) Crear secret en tu repositorio GitHub:
    - Nombre: `FIREBASE_SERVICE_ACCOUNT`
    - Valor: el JSON completo de la cuenta de servicio (copiar/pegar el contenido del archivo `serviceAccountKey.json`).

2) El workflow está en `.github/workflows/update-semana.yml` y se ejecuta cada lunes a las `00:05 UTC` (ajusta cron si necesitas otra hora/zonahoraria).

Nota: el workflow fue actualizado para ejecutarse cada lunes a las `00:00 UTC` (medianoche). Si necesitas otra hora local, convierte a UTC o cambia la expresión `cron` en `.github/workflows/update-semana.yml`.

3) También puedes dispararlo manualmente desde la pestaña "Actions" -> seleccionar "Actualizar semana de rotación" -> "Run workflow".

Logs y seguridad
-----------------
- GitHub Actions manejará el secreto y solo lo escribirá en un archivo temporal para el job. Revisa las ejecuciones en la pestaña Actions para ver logs y resultados.
- No subas nunca tu JSON de credenciales al repositorio.


