# Despliegue en VPS Hostinger (Ubuntu 24.04)

Arquitectura final:

```
Internet ──:80──▶ Nginx ──▶ Next.js (:3000)          [web]
Internet ──:3334─────────▶ NestJS + Socket.IO        [backend + /uploads]
                              └──▶ PostgreSQL local
PM2 mantiene ambos procesos vivos y los reinicia al reboot.
```

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
construye ambas apps y deja corriendo:

- **Web**: http://212.85.0.138
- **API**: http://212.85.0.138:3334

## Actualizar a una nueva versión

```bash
ssh root@212.85.0.138 "bash /var/www/rueda/deploy/setup-vps.sh"
```

(hace `git pull` + rebuild + restart; los uploads y la BD no se tocan).

## App móvil

Crear `mobile/.env` con:

```
EXPO_PUBLIC_API_URL=http://212.85.0.138:3334
```

y volver a compilar/abrir con Expo. (`userStore.ts` ya prioriza esa variable.)

## Comandos útiles en el VPS

```bash
pm2 status            # estado de backend y web
pm2 logs rueda-backend
pm2 restart rueda-web
sudo -u postgres psql -d ruedanegocios   # consola de la BD
```

## Cuando tengan dominio (opcional, recomendado)

1. Apuntar el dominio A → 212.85.0.138 (y `api.dominio.com` A → la misma IP).
2. En Nginx: agregar un `server` para `api.dominio.com` → `proxy_pass http://127.0.0.1:3334;`
   **con los headers `Upgrade`/`Connection "upgrade"`** (Socket.IO los necesita).
3. `apt install certbot python3-certbot-nginx && certbot --nginx` → HTTPS gratis.
4. Cambiar `API_PUBLIC_URL` en `setup-vps.sh` a `https://api.dominio.com`, re-ejecutar el script.
   HTTPS es requisito para que la app móvil funcione en builds de producción.

## Notas de seguridad

- **Los secretos (Gmail, BD, JWT) viven solo en `deploy/secrets.env` (gitignoreado) y en
  `/root/rueda_secrets.env` del VPS.** El script falla a propósito si el archivo no existe.
- `deploy/rueda_dump.sql` también está gitignoreado (contiene datos personales y hashes).
- El dump restaurado se renombra a `.restaurado` para no re-aplicarse en updates.
