# Rueda de Negocios — Guía de instalación y ejecución

Sistema de gestión de eventos de negocios con tres componentes:

| Componente | Tecnología | Puerto |
|---|---|---|
| **Backend** | NestJS + Prisma + PostgreSQL | 3334 |
| **Web** | Next.js (App Router) | 3000 |
| **Mobile** | React Native + Expo | — |

---

## Requisitos previos

Instalar antes de continuar:

- [Node.js](https://nodejs.org/) v18 o superior
- [PostgreSQL](https://www.postgresql.org/download/) — configurar en **puerto 5433** (o ajustar el `.env`)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) para la app móvil
- Git

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/VillarroelSebastian/RuedaDeNegocios.git
cd RuedaDeNegocios
```

---

## 2. Backend

### 2.1 Instalar dependencias

```bash
cd backend
npm install
```

### 2.2 Crear el archivo `.env`

El archivo `.env` **no está en el repositorio** (está en `.gitignore`). Créalo dentro de `backend/`:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5433/RuedaDeNegocios?schema=public"
PORT=3334
MAIL_USER=tu_correo@gmail.com
MAIL_PASS=tu_app_password_gmail
MAIL_FROM=tu_correo@gmail.com
WEB_URL=http://localhost:3000
```

> **MAIL_PASS**: debe ser una **contraseña de aplicación** de Google, no tu contraseña normal.
> Ve a: Cuenta de Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación.

### 2.3 Crear la base de datos

Abre pgAdmin o psql y ejecuta:

```sql
CREATE DATABASE "RuedaDeNegocios";
```

### 2.4 Aplicar el esquema con Prisma

```bash
npx prisma generate
npx prisma db push
```

### 2.5 Agregar columnas que no están en las migraciones

Estas columnas se añadieron directamente a la DB (no vía migración). Ejecutarlas en PostgreSQL:

```sql
-- Tokens para restablecimiento de contraseña
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS "resetToken" VARCHAR(255);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(6);

-- Estado de habilitación de mesas
ALTER TABLE mesa ADD COLUMN IF NOT EXISTS "estaHabilitada" SMALLINT NOT NULL DEFAULT 1;
```

> Después volver a regenerar el cliente:
> ```bash
> npx prisma generate
> ```

### 2.6 Crear usuario administrador inicial

```bash
node -e "
const { Client } = require('pg');
const bcrypt = require('bcrypt');
async function main() {
  const c = new Client({ connectionString: 'postgresql://postgres:TU_PASSWORD@localhost:5433/RuedaDeNegocios' });
  await c.connect();
  const hash = await bcrypt.hash('admin@rueda.com', 10);
  const ev = await c.query('SELECT id FROM evento WHERE \"esPrincipal\" = 1 LIMIT 1');
  const eventoId = ev.rows[0]?.id ?? null;
  await c.query(
    \`INSERT INTO usuario (correo, contrasenia, nombres, \"apellidoPaterno\", telefono, \"urlFotoPerfil\", \"rolEvento\", \"estaActivo\", \"evento_id\")
     VALUES (\$1,\$2,'Admin','Sistema','00000000','','ADMINISTRADOR',1,\$3)
     ON CONFLICT DO NOTHING\`,
    ['admin@rueda.com', hash, eventoId]
  );
  console.log('Usuario admin creado: admin@rueda.com / admin@rueda.com');
  await c.end();
}
main();
"
```

### 2.7 Iniciar el backend

```bash
npm start
```

La carpeta `uploads/` se crea automáticamente en `backend/uploads/` la primera vez que se sube un archivo.

---

## 3. Web

### 3.1 Instalar dependencias

```bash
cd web
npm install
```

### 3.2 Variables de entorno (opcional)

Si el backend corre en un puerto diferente, crear `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3334
```

Por defecto ya usa `http://localhost:3334`.

### 3.3 Iniciar la web

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 4. Mobile

### 4.1 Instalar dependencias

```bash
cd mobile
npm install
```

### 4.2 Iniciar Expo

```bash
npx expo start
```

- **Emulador Android**: presiona `a`
- **Simulador iOS**: presiona `i`
- **Dispositivo físico**: escanea el QR con la app Expo Go

> La app detecta automáticamente la IP del backend. Para dispositivos físicos, asegúrate de que el teléfono y la PC estén en la **misma red WiFi**.

---

## 5. Credenciales por defecto

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@rueda.com` | `admin@rueda.com` |
| Técnico | `tecnico@rueda.com` | `tecnico@rueda.com` |

> Las contraseñas de empresas registradas se generan automáticamente y se envían por correo al aprobar el pago.

---

## 6. Estructura del proyecto

```
RuedaDeNegocios/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── app.controller.ts     # Todos los endpoints principales
│   │   ├── imagenes/             # Endpoint de subida de archivos
│   │   ├── prisma/               # Servicio Prisma
│   │   └── main.ts               # Bootstrap + archivos estáticos
│   ├── prisma/
│   │   └── schema.prisma         # Modelos de la DB
│   ├── uploads/                  # Archivos subidos (ignorado en git)
│   └── .env                      # Variables de entorno (ignorado en git)
├── web/              # Next.js
│   └── src/app/
│       ├── admin/                # Panel administrador
│       ├── tecnico/              # Panel técnico
│       ├── auth/                 # Login y recuperación de contraseña
│       ├── registro/             # Registro público de empresas
│       └── seguimiento/          # Estado de inscripción (público)
└── mobile/           # React Native + Expo
    └── src/screens/
        ├── admin/
        ├── tecnico/
        └── auth/
```

---

## 7. Archivos ignorados por Git

Estos archivos **no están en el repositorio** y debes crearlos manualmente:

| Archivo | Descripción |
|---|---|
| `backend/.env` | Variables de entorno (DB, correo, puerto) |
| `backend/uploads/` | Archivos subidos por los usuarios |
| `web/.env.local` | Variables opcionales del frontend |
| `*/node_modules/` | Dependencias (instalar con `npm install`) |

---

## 8. Problemas frecuentes

### Error: `resetToken does not exist in type`
El cliente Prisma no está actualizado. Ejecuta:
```bash
cd backend
npx prisma generate
```

### Error: `Cannot connect to database`
- Verifica que PostgreSQL esté corriendo en el **puerto 5433**
- Verifica que el `DATABASE_URL` en `.env` tenga la contraseña correcta
- Verifica que la base de datos `RuedaDeNegocios` exista

### El correo no se envía
- El `MAIL_PASS` debe ser una **contraseña de aplicación** de Gmail (16 caracteres sin espacios)
- Activa la verificación en 2 pasos en tu cuenta Google antes de generar la contraseña de app

### La app móvil no conecta al backend
- El teléfono y la PC deben estar en la **misma red WiFi**
- Verifica que el firewall de Windows permita conexiones en el puerto 3334

### `uploads/` no sirve las imágenes
- La carpeta se crea automáticamente al subir el primer archivo
- Si hay problema, créala manualmente: `mkdir backend/uploads`

---

## 9. Orden de inicio recomendado

```
1. PostgreSQL  →  debe estar corriendo
2. cd backend && npm start
3. cd web && npm run dev
4. cd mobile && npx expo start   (opcional)
```
