# Puesta en marcha

Antes de publicar el backend actualizado, aplicar las migraciones con `npx prisma migrate deploy` desde `backend`, usando la conexión de la base de datos correspondiente. Esta migración agrega los campos de edición, las vistas de conversaciones por usuario, las lecturas por evento y la desactivación lógica de suscripciones push. No elimina mensajes ni conversaciones existentes.

Los mensajes antiguos enviados por staff no tienen un identificador fiable de su autor: se mantienen visibles, pero no se permite editarlos o eliminarlos hasta contar con esa identidad. Los nuevos mensajes guardan el usuario remitente.

La entrega de notificaciones del sistema necesita los permisos del dispositivo y la configuración push existente del entorno. Verificar en un teléfono Android real el teclado, la barra de navegación y la recepción con la aplicación en segundo plano antes de publicar la versión móvil.
