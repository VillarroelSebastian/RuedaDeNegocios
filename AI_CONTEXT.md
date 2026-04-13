# Rueda De Negocios - AI Development Context

Este archivo mantiene el contexto actualizado del desarrollo del proyecto "Rueda de Negocios" para asegurar transiciones limpias y efectivas entre diferentes agentes de IA.

## Estado Actual (Abril 2026)

### 1. Arquitectura y Tecnologías Base
- **Backend**: NestJS corriendo en el **puerto 3334**. (Se cambió del 3333 por problemas de `EADDRINUSE`).
- **Base de Datos**: PostgreSQL + Prisma ORM.
- **Web Frontend**: Next.js (React) corriendo en puerto nativo (usualmente `3000` o `3001`). Usa TailwindCSS y la librería `lucide-react` para íconos vectoriales.
- **Mobile Frontend**: React Native + Expo + NativeWind. Usa `lucide-react-native` nativo para igualar la calidad gráfica de la interfaz Web.

### 2. Tablero Principal (Dashboard)
El dashboard administrativo (`/admin/dashboard` en Web y `DashboardScreen` en Móvil) **es 100% dinámico**. Se alimenta del endpoint `GET /admin/dashboard/stats`, el cual consulta `empresa.count()`, `reunion.count()` y otras tablas reales. Ambos frontends tienen protecciones defensivas de array si el backend entrega temporalmente objetos vacíos.

### 3. Módulo "Eventos" (Full CRUD)
El proyecto ha transicionado a soportar Múltiples Eventos mediante la política de **Borrado Lógico** (`estaActivo=0` significa eliminado).
Adicionalmente, se ha integrado una "Jerarquía de Eventos".
* **Prisma Schema (importante)**: Se añadió recientemente la columna nativa `esPrincipal Int @default(0) @db.SmallInt` en la tabla `evento`. Esta distinción permite que solo exista *un* evento como el gran maestro de donde operará todo, permitiendo archivar el resto como versiones pasadas.
* **Mecánica Crítica Backend**:
  - No está permitido borrar lógicamente al Evento listado como "Principal" (`DELETE /admin/eventos/:id` lanza excepción).
  - Al designar uno nuevo con estrella (`PUT /admin/eventos/:id/set-principal`), todos los otros eventos pasan automáticamente a `esPrincipal = 0`.
* **Frontend Web Implementado (`/admin/eventos`)**: Dispone de un Panel Organizador en Tarjetas. Se usa `[id]/page.tsx` reutilizable para Nuevo / Edit. Atributos incluidos: `descripcion`, `edicion` y los URLs de mapas y cronogramas.
* **Frontend Móvil Implementado (`EventConfigScreen.tsx`)**: Opera bajo la Pestaña Nativa (Bottom Nav). Implementa Estados Condicionales Unificados (Renderiza `<Lista>` o bien renderiza `<Formulario>` basado en estados para ahorrar complejidad de enrutamiento con Stack).

### Puntos Abiertos para Futuro Asistente
- **Integración de QR Visuales**: El formulario actualmente posee una columna en tabla (HTML Web e UI Móvil) nombrada "Cargar QR". Ahora mismo no lo vinculamos a un FileUploader real (AWS/Cloudinary). Deberá construirse `multipart/form-data` para reemplazar el link quemado de pruebas.
- Completar las pantallas faltantes del Menú lateral (Empresas, Pagos, Reuniones, Agenda, Técnicos, Estadísticas), las cuales por ahora tienen placeholders. Mapearlos con los endpoints respectivos y continuar el lenguaje estético y responsivo establecido.

> ¡Cualquier duda adicional, refiérase al "prisma/schema.prisma" como fuente única de verdad para las relaciones transaccionales (Ej: empresaevento, resultadoreunion, solicitudreunion)!
