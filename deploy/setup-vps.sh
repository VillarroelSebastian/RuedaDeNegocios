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
REPO_URL="https://github.com/VillarroelSebastian/RuedaDeNegocios.git"
APP_DIR="/var/www/rueda"
DB_NAME="ruedanegocios"
DB_USER="rueda"
# Si más adelante tienen dominio, cambiar por https://api.dominio / https://dominio
API_PUBLIC_URL="http://${IP_PUBLICA}:3334"
WEB_PUBLIC_URL="http://${IP_PUBLICA}"

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
MAIL_USER="${MAIL_USER}"
MAIL_PASS="${MAIL_PASS}"
MAIL_FROM="${MAIL_FROM}"
PUBLIC_URL="${API_PUBLIC_URL}"
WEB_URL="${WEB_PUBLIC_URL}"
EOF
npm ci
npx prisma generate
npx prisma db push   # crea/sincroniza tablas (no borra datos)
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

echo "════════ 7/8 Nginx (:80 → web) ════════"
cp "${APP_DIR}/deploy/nginx-rueda.conf" /etc/nginx/sites-available/rueda
ln -sf /etc/nginx/sites-available/rueda /etc/nginx/sites-enabled/rueda
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "════════ 8/8 Firewall + arranque automático ════════"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 3334/tcp
ufw --force enable
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ LISTO"
echo "  Web:     http://${IP_PUBLICA}"
echo "  Backend: ${API_PUBLIC_URL}"
echo "  Logs:    pm2 logs | pm2 status"
echo "══════════════════════════════════════════════════"
