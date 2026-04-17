---
name: Contexto del proyecto Rueda de Negocios del Beni
description: Stack técnico, arquitectura y estado actual del panel administrativo
type: project
---

**Stack:**
- Backend: NestJS 11 + Prisma 7 (PostgreSQL). Todo en app.controller.ts (un solo controlador).
- Web: Next.js 14 App Router + TailwindCSS. Admin layout en /admin/ con Sidebar + Header components.
- Mobile: React Native (Expo 54) + NativeWind + React Navigation (Stack + BottomTabs).
- Imágenes: Cloudinary (cloud_name: dk5u8dljb) en endpoint POST /admin/imagenes/upload

**Auth:** Login simple con bcrypt. Web guarda usuario en localStorage ('adminUser'). Mobile usa userStore (módulo en-memoria) en src/utils/userStore.ts. Roles: 'Administrador', 'TECNICO'.

**IP backend:** Web usa http://localhost:3334. Mobile emulador usa http://10.0.2.2:3334.

**Módulos implementados (Abril 2026):**
- Backend: dashboard, eventos, empresas, pagos, actividades, noticias, mesas, técnicos, estadísticas, notificaciones, perfil
- Web: todas las páginas del admin panel completo
- Mobile: AdminNavigator (BottomTabs + Stack), todas las screens

**Navegación mobile:** App.tsx → Stack(Login, AdminRoot) → AdminNavigator → BottomTabs(Dashboard, Empresas, Pagos, Mesas, Menú) + Stack(Actividades, Noticias, Tecnicos, Estadisticas, Configuracion, PagoDetail)

**Why:** Proyecto de grado universitario (tesis) para sistema de gestión de rueda de negocios del departamento del Beni, Bolivia.

**How to apply:** Al agregar nuevos features, seguir el patrón existente: endpoint en app.controller.ts, página web en /admin/[modulo]/page.tsx, screen mobile en src/screens/admin/[Modulo]Screen.tsx.
