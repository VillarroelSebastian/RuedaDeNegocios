#!/bin/bash
# ============================================================================
# Despliegue Rueda de Negocios — VPS Ubuntu 24.04 (Hostinger)
# Instala Node 20, PostgreSQL, Nginx y PM2; clona el repo, construye
# backend (NestJS :3334) y web (Next.js :3000 detrás de Nginx :80).
# Ejecutar como root:  bash setup-vps.sh
# Idempotente: se puede re-ejecutar para actualizar (git pull + rebuild).
# ============================================================================
set -e

# ── Configuración ───────────────────────────────────────────────────────────
IP_PUBLICA="212.85.0.138"
DOMINIO="app.ruedadenegocios.univalle.edu"   # dominio en producción, con HTTPS vía Certbot
REPO_URL="https://github.com/VillarroelSebastian/RuedaDeNegocios.git"
APP_DIR="/var/www/rueda"
DB_NAME="ruedanegocios"
DB_USER="rueda"
# API y web quedan detrás de Nginx bajo el mismo origen HTTPS del dominio:
#   https://dominio/api/*      → backend (proxy quita el prefijo /api)
#   https://dominio/socket.io/ → backend (websockets)
#   https://dominio/uploads/*  → backend (imágenes subidas)
#   https://dominio/*          → web
WEB_PUBLIC_URL="https://${DOMINIO}"
API_PUBLIC_URL="https://${DOMINIO}/api"
# Base para las URLs de archivos subidos (/uploads) — sin sufijo /api, es una
# location aparte en Nginx que también apunta directo al backend.
UPLOADS_BASE_URL="https://${DOMINIO}"

# ── Secretos (NUNCA en el repositorio) ──────────────────────────────────────
# Subir antes con:  scp deploy/secrets.env root@IP:/root/rueda_secrets.env
# Formato: ver deploy/secrets.env.example
if [ ! -f /root/rueda_secrets.env ]; then
  echo "✖ Falta /root/rueda_secrets.env con DB_PASS, JWT_SECRET, MAIL_USER, MAIL_PASS y MAIL_FROM."
  echo "  Súbelo desde tu PC:  scp deploy/secrets.env root@${IP_PUBLICA}:/root/rueda_secrets.env"
  exit 1
fi
set -a; source /root/rueda_secrets.env; set +a
for v in DB_PASS JWT_SECRET MAIL_USER MAIL_PASS MAIL_FROM; do
  if [ -z "${!v}" ]; then echo "✖ Falta la variable $v en /root/rueda_secrets.env"; exit 1; fi
done
chmod 600 /root/rueda_secrets.env

echo "════════ 1/8 Paquetes del sistema ════════"
apt-get update -y
apt-get install -y curl git nginx postgresql postgresql-contrib ufw

echo "════════ 2/8 Node.js 20 + PM2 ════════"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2

echo "════════ 3/8 PostgreSQL: usuario y base ════════"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

# Restaurar dump si existe (subirlo antes con: scp rueda_dump.sql root@IP:/root/)
if [ -f /root/rueda_dump.sql ]; then
  echo "──── Restaurando dump /root/rueda_dump.sql ────"
  sudo -u postgres psql -d ${DB_NAME} -f /root/rueda_dump.sql || true
  sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO ${DB_USER}; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};"
  mv /root/rueda_dump.sql /root/rueda_dump.sql.restaurado
fi

echo "════════ 4/8 Código fuente ════════"
mkdir -p "$(dirname ${APP_DIR})"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" pull
else
  git clone "${REPO_URL}" "${APP_DIR}"
fi

echo "════════ 5/8 Backend (NestJS :3334) ════════"
cd "${APP_DIR}/backend"
cat > .env <<EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
PORT=3334
NODE_ENV=production
BIND_ADDRESS=127.0.0.1
CORS_ORIGINS="${WEB_PUBLIC_URL}"
MAIL_USER="${MAIL_USER}"
MAIL_PASS="${MAIL_PASS}"
MAIL_FROM="${MAIL_FROM}"
PUBLIC_URL="${UPLOADS_BASE_URL}"
WEB_URL="${WEB_PUBLIC_URL}"
EOF
npm ci
npx prisma generate
# Bases instaladas antes del historial de migraciones ya contienen este esquema
# (se creaban con db push). Se marca la línea base, sin volver a crear tablas.
if sudo -u postgres psql -d "${DB_NAME}" -tAc "SELECT to_regclass('public.usuario') IS NOT NULL" | grep -q t; then
  npx prisma migrate resolve --applied 20260701000000_baseline 2>/dev/null || true
fi
if sudo -u postgres psql -d "${DB_NAME}" -tAc "SELECT to_regclass('public.cambioreunion') IS NOT NULL" | grep -q t; then
  npx prisma migrate resolve --applied 20260728190000_cambios_reunion_con_acuerdo 2>/dev/null || true
fi
# No se elige automáticamente qué cuenta histórica conservar: si hay datos
# incompatibles, se detiene el despliegue con un diagnóstico explícito.
if sudo -u postgres psql -d "${DB_NAME}" -tAc "SELECT to_regclass('public.usuario') IS NOT NULL AND EXISTS (SELECT 1 FROM usuario WHERE \"estaActivo\"=1 GROUP BY lower(correo) HAVING count(*)>1)" | grep -q t; then
  echo "✖ Existen correos activos duplicados. Depúralos antes de aplicar la migración de seguridad."
  exit 1
fi
if sudo -u postgres psql -d "${DB_NAME}" -tAc "SELECT to_regclass('public.empresaevento') IS NOT NULL AND (EXISTS (SELECT 1 FROM empresaevento WHERE \"estaActivo\"=1 GROUP BY empresa_id,evento_id HAVING count(*)>1) OR EXISTS (SELECT 1 FROM mesa GROUP BY evento_id,\"numeroMesa\" HAVING count(*)>1) OR EXISTS (SELECT 1 FROM resultadoreunion WHERE \"estaActivo\"=1 GROUP BY reunion_id,\"empresaeventoCalificadora_id\" HAVING count(*)>1))" | grep -q t; then
  echo "✖ Existen participaciones, mesas o resultados duplicados. Revisa esos registros antes de migrar."
  exit 1
fi
npx prisma migrate deploy
npm run build
mkdir -p uploads
pm2 delete rueda-backend 2>/dev/null || true
pm2 start dist/src/main.js --name rueda-backend

echo "════════ 6/8 Web (Next.js :3000) ════════"
cd "${APP_DIR}/web"
echo "NEXT_PUBLIC_API_URL=${API_PUBLIC_URL}" > .env.production
npm ci
npm run build
pm2 delete rueda-web 2>/dev/null || true
pm2 start npm --name rueda-web -- start

echo "════════ 7/8 Nginx (:80/:443 → web + /api,/socket.io,/uploads → backend) ════════"
CERT_PATH="/etc/letsencrypt/live/${DOMINIO}/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
  # El certificado ya existe: Certbot ya reescribió sites-available/rueda con
  # el bloque 443 + redirect. NO lo pisamos con la plantilla base (la
  # destruiría). Solo verificamos y recargamos.
  echo "Certificado HTTPS existente detectado — se conserva la config actual de Nginx."
  nginx -t && systemctl reload nginx
else
  cp "${APP_DIR}/deploy/nginx-rueda.conf" /etc/nginx/sites-available/rueda
  ln -sf /etc/nginx/sites-available/rueda /etc/nginx/sites-enabled/rueda
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx

  echo "════════ Emitiendo certificado HTTPS con Certbot ════════"
  apt-get install -y certbot python3-certbot-nginx -q
  certbot --nginx -d "${DOMINIO}" --non-interactive --agree-tos -m "admin@${DOMINIO#*.}" --redirect || \
    echo "⚠️  Certbot falló (¿el DNS del dominio aún no apunta a este servidor?). La web sigue funcionando por HTTP."
fi

echo "════════ 8/8 Firewall + arranque automático ════════"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw delete allow 3334/tcp 2>/dev/null || true
ufw --force enable
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ LISTO"
echo "  Web:     ${WEB_PUBLIC_URL}  (IP directa: http://${IP_PUBLICA})"
echo "  Backend: ${API_PUBLIC_URL}"
echo "  Logs:    pm2 logs | pm2 status"
echo "══════════════════════════════════════════════════"
