---
name: Reglas del proyecto Rueda de Negocios
description: Reglas obligatorias que la IA debe seguir en este proyecto
type: feedback
---

- Lo que se realice en la parte web también se tiene que realizar en la parte móvil
- La eliminación es lógica en la base de datos (soft delete, estaActivo = 0)
- Los mensajes de confirmación, advertencia o error deben ser con modales o Alerts nativos (no alert() del navegador ni mensajes predeterminados)
- Si se pasa una foto de diseño y no hay un ícono exacto, buscar URLs de imágenes online para web o usar expo-image-picker para mobile
- Las URLs de fotos y archivos se manejan con Cloudinary (ya configurado en /admin/imagenes/upload)

**Why:** El usuario especificó estas reglas explícitamente para mantener consistencia cross-platform y buena UX.

**How to apply:** En cada cambio/feature, verificar estas 5 reglas antes de entregar.
