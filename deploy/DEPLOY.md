# Despliegue en VPS Hostinger (Ubuntu 24.04)

**Producción: https://app.ruedadenegocios.univalle.edu** (HTTPS activo vía Let's Encrypt/Certbot,
renovación automática, certificado emitido 2026-07 / vence 2026-10-18).

Arquitectura final:

```
Internet ──:443/HTTPS──▶ Nginx ──▶ Next.js (:3000)                  [web, /]
                              └──▶ NestJS + Socket.IO (:3334)        [/api, /socket.io, /uploads]
                                       └──▶ PostgreSQL local
Internet ──:3334 (IP directa, sin proxy) ──▶ NestJS                 [acceso directo, ej. app móvil en dev]
PM2 mantiene ambos procesos vivos y los reinicia al reboot.
Certbot renueva el certificado solo (systemd timer).
```

La IP directa `212.85.0.138` en el puerto 80 devuelve 404 a propósito (Certbot
redirige todo host desconocido) — el dominio es la única entrada web válida.
El puerto 3334 sigue respondiendo por IP sin pasar por Nginx (útil para
depurar la API o para apps móviles en desarrollo).

## Pasos (una sola vez)

**1. Preparar y subir los secretos y el dump** (desde tu PC, en la carpeta del proyecto).
Copiar `deploy/secrets.env.example` a `deploy/secrets.env`, poner los valores reales
(este archivo está en `.gitignore` y **nunca** debe subirse a GitHub), y luego:

```bash
scp deploy/secrets.env  root@212.85.0.138:/root/rueda_secrets.env
scp deploy/rueda_dump.sql root@212.85.0.138:/root/
```

**2. Entrar al VPS y ejecutar el script:**

```bash
ssh root@212.85.0.138
curl -fsSL https://raw.githubusercontent.com/VillarroelSebastian/RuedaDeNegocios/main/deploy/setup-vps.sh -o setup-vps.sh
bash setup-vps.sh
```

El script instala todo, restaura el dump si está en `/root/rueda_dump.sql`,
construye ambas apps, emite el certificado HTTPS (si el DNS del dominio ya
apunta al servidor) y deja corriendo:

- **Web**: https://app.ruedadenegocios.univalle.edu
- **API**: https://app.ruedadenegocios.univalle.edu/api
- (fallback sin dominio: http://212.85.0.138 / http://212.85.0.138:3334)

## Actualizar a una nueva versión

```bash
ssh root@212.85.0.138 "bash /var/www/rueda/deploy/setup-vps.sh"
```

(hace `git pull` + rebuild + restart; los uploads y la BD no se tocan).

## App móvil

Crear `mobile/.env` con:

```
EXPO_PUBLIC_API_URL=https://app.ruedadenegocios.univalle.edu/api
```

y volver a compilar/abrir con Expo. (`userStore.ts` ya prioriza esa variable.)
Nota: el Socket.IO del cliente ya recorta el sufijo `/api` automáticamente
para conectarse al origen correcto — no hace falta configurarlo aparte.

## Comandos útiles en el VPS

```bash
pm2 status            # estado de backend y web
pm2 logs rueda-backend
pm2 restart rueda-web
sudo -u postgres psql -d ruedanegocios   # consola de la BD
```

## Dominio y HTTPS (ya activo)

`app.ruedadenegocios.univalle.edu` → `212.85.0.138` (registro A gestionado por TI de Univalle).
`setup-vps.sh` detecta si el certificado ya existe: si sí, **no toca** la configuración de
Nginx que Certbot dejó (evita romper el bloque HTTPS en un redeploy); si no existe aún,
la crea con Certbot automáticamente (requiere que el DNS ya resuelva a este servidor).

Renovación: automática vía systemd timer de Certbot. Verificar manualmente con
`certbot renew --dry-run` si hace falta.

## Notas de seguridad

- **Los secretos (Gmail, BD, JWT) viven solo en `deploy/secrets.env` (gitignoreado) y en
  `/root/rueda_secrets.env` del VPS.** El script falla a propósito si el archivo no existe.
- `deploy/rueda_dump.sql` también está gitignoreado (contiene datos personales y hashes).
- El dump restaurado se renombra a `.restaurado` para no re-aplicarse en updates.
