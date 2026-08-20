# Traspaso de administración y despliegues

Este documento indica todo lo que debe recibir la persona que administrará y
desplegará la plataforma Rueda de Negocios. No contiene contraseñas reales y
puede permanecer en el repositorio.

## 1. Datos de producción

- Web: `https://app.ruedadenegocios.univalle.edu`
- API: `https://app.ruedadenegocios.univalle.edu/api`
- VPS: `212.85.0.138`
- Usuario actual del VPS: `root`
- Proyecto en el VPS: `/var/www/rueda`
- Repositorio: `https://github.com/VillarroelSebastian/RuedaDeNegocios`
- Rama desplegada: `main`
- Procesos PM2: `rueda-web` y `rueda-backend`

## 2. Lo que debe entregarse

### Acceso al código

Agregar a la persona como colaboradora del repositorio de GitHub. No compartir
la contraseña ni un token personal del propietario actual.

El repositorio contiene todo el código necesario:

- `backend/`: API NestJS y Prisma.
- `web/`: aplicación web Next.js.
- `mobile/`: aplicación móvil Expo.
- `deploy/setup-vps.sh`: actualización y reconstrucción del VPS.
- `deploy/nginx-rueda.conf`: configuración de Nginx.
- `deploy/DEPLOY.md`: documentación técnica del despliegue.
- `deploy/secrets.env.example`: plantilla de secretos.

### Acceso SSH al VPS

La persona nueva debe generar su propia clave SSH. No se debe compartir la clave
privada personal existente `C:\Users\sebas\.ssh\rueda_vps`.

En Windows, la persona nueva puede ejecutar:

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\rueda_vps
```

Debe enviar únicamente el contenido de `rueda_vps.pub`. El administrador actual
debe agregar esa clave pública en el VPS, en `/root/.ssh/authorized_keys`.

Comprobación de acceso:

```powershell
ssh -i $env:USERPROFILE\.ssh\rueda_vps root@212.85.0.138
```

### Secretos de producción

El archivo real está solamente en el VPS:

```text
/root/rueda_secrets.env
```

Debe entregarse mediante un gestor de contraseñas o archivo cifrado. Nunca debe
enviarse por GitHub, correo sin cifrar o un chat común.

Para obtener una copia temporal desde una computadora autorizada:

```powershell
scp -i $env:USERPROFILE\.ssh\rueda_vps root@212.85.0.138:/root/rueda_secrets.env .
```

El archivo contiene:

```dotenv
DB_PASS=contraseña_de_postgresql_de_produccion
JWT_SECRET=secreto_para_firmar_sesiones
MAIL_USER=cuenta_que_envia_correos
MAIL_PASS=contraseña_de_aplicacion_de_gmail
MAIL_FROM="Nombre del remitente <correo@dominio>"
```

Aunque no se transfiera la base de datos local, `DB_PASS` de producción es
obligatorio para que la API pueda conectarse a PostgreSQL en el VPS.

Después de confirmar el traspaso se recomienda generar un nuevo `MAIL_PASS` y
revocar la contraseña de aplicación anterior.

### Cuenta de correo

Entregar acceso administrativo a la cuenta indicada en `MAIL_USER`, incluyendo:

- Método de recuperación de la cuenta.
- Verificación en dos pasos.
- Capacidad de crear y revocar contraseñas de aplicación.
- Confirmación del remitente configurado en `MAIL_FROM`.

No se debe compartir la contraseña personal de Google si puede transferirse la
propiedad o utilizarse una cuenta institucional dedicada.

### Proveedor del VPS y dominio

Entregar o delegar acceso a:

- Cuenta de Hostinger o proveedor que administra el VPS `212.85.0.138`.
- Facturación y renovación del servidor.
- Contacto de TI de Univalle responsable del DNS.
- Administración del registro A de `app.ruedadenegocios.univalle.edu`.

El certificado HTTPS está gestionado por Certbot dentro del VPS. No es necesario
copiar manualmente `/etc/letsencrypt`.

## 3. Procedimiento de despliegue

Los cambios deben estar confirmados y publicados en `main`. Para desplegar:

```powershell
ssh -i $env:USERPROFILE\.ssh\rueda_vps root@212.85.0.138 "bash /var/www/rueda/deploy/setup-vps.sh"
```

El script realiza `git pull`, instala dependencias, ejecuta las migraciones
pendientes, compila backend y web y reinicia PM2.

Comprobaciones posteriores:

```powershell
ssh -i $env:USERPROFILE\.ssh\rueda_vps root@212.85.0.138 "pm2 status"
```

```powershell
curl.exe -I https://app.ruedadenegocios.univalle.edu
curl.exe -I https://app.ruedadenegocios.univalle.edu/api/public/evento
```

Ambas aplicaciones deben aparecer `online` en PM2 y las URLs deben responder.

## 4. Comandos de soporte

```bash
pm2 status
pm2 logs rueda-backend
pm2 logs rueda-web
pm2 restart rueda-backend
pm2 restart rueda-web
nginx -t
systemctl status nginx
certbot certificates
```

## 5. Aplicación móvil

El archivo local `mobile/.env` no se versiona. La persona debe crearlo con:

```dotenv
EXPO_PUBLIC_API_URL=https://app.ruedadenegocios.univalle.edu/api
```

No contiene credenciales de usuario.

## 6. Archivos y datos que no deben entregarse

- Base de datos local.
- Dumps SQL con información personal, salvo autorización expresa.
- `node_modules/`, `.next/`, `dist/`, `build/` y `.expo/`.
- Logs locales o del servidor con información sensible.
- Claves privadas SSH personales.
- Contraseñas personales de Gmail, GitHub o Hostinger.
- Archivos `.env` de desarrollo que no correspondan a producción.

Los uploads de producción viven en `/var/www/rueda/backend/uploads`. No deben
copiarse para un despliegue normal; permanecen en el VPS durante las actualizaciones.

## 7. Checklist de entrega

- [ ] Acceso al repositorio GitHub confirmado.
- [ ] Clave SSH propia de la persona agregada al VPS.
- [ ] Inicio de sesión SSH comprobado.
- [ ] `rueda_secrets.env` entregado por un canal cifrado.
- [ ] Acceso al correo emisor o cuenta institucional transferido.
- [ ] Nueva contraseña de aplicación de Gmail creada.
- [ ] Acceso al proveedor del VPS transferido.
- [ ] Contacto o acceso para administrar el DNS entregado.
- [ ] Despliegue de prueba ejecutado correctamente.
- [ ] Web y API verificadas por HTTPS.
- [ ] Procesos `rueda-web` y `rueda-backend` confirmados como `online`.
- [ ] Credenciales antiguas revocadas después de completar el traspaso.

## 8. Recomendación final de seguridad

Una vez que la persona nueva confirme todos los accesos, rotar:

1. Contraseña de aplicación de Gmail (`MAIL_PASS`).
2. Accesos del proveedor del VPS.
3. Claves SSH que ya no deban conservar acceso.

Cambiar `JWT_SECRET` cerraría las sesiones activas de todos los usuarios, por lo
que solo debe hacerse en una ventana de mantenimiento planificada.
