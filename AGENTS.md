# Reglas del proyecto

- Los cambios funcionales de web deben tener su equivalente en mobile.
- La eliminación en la base de datos es lógica. Eliminar una conversación debe afectar solo la vista del usuario que la elimina.
- Las confirmaciones, advertencias y errores usan los modales del proyecto; no usar alertas o confirmaciones predeterminadas del navegador.
- Los datos y operaciones pertenecen a un evento y solo aparecen en ese evento. Validar los permisos en el backend.
- Las fotos y archivos de la aplicación se almacenan y gestionan mediante el backend.
- Los campos de formularios son obligatorios, salvo que sean opcionales en la base de datos o no tenga sentido exigirlos.
- La web debe ser responsiva, también para pantallas móviles.
- Las imágenes deben verse completas dentro del espacio asignado (`contain`), y abrir una previsualización al pulsarlas.
- Si se proporciona una referencia de diseño y falta un icono equivalente exacto, buscar una URL de imagen en Google para web/mobile; gestionar el recurso mediante el backend.
