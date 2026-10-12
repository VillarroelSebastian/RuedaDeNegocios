# Seguridad de los datos (Play Console › Contenido de la app › Seguridad de los datos)

Respuestas sugeridas según lo que realmente hace la app. Revísalas antes de enviar.

## Preguntas generales
- ¿La app recopila o comparte datos de usuario obligatorios? **Sí**
- ¿Todos los datos se cifran en tránsito? **Sí** (HTTPS)
- ¿Ofreces una forma de que los usuarios soliciten la eliminación de sus datos? **Sí**
  - En la app: Perfil › Eliminar mi cuenta.
  - URL: https://app.ruedadenegocios.univalle.edu/eliminar-cuenta
- ¿Se comparten datos con terceros? **No** (ver nota abajo).
- ¿Cumples la política de Familias? No aplica: la app no está dirigida a niños.

## Datos que se recopilan

| Categoría | Tipo | Obligatorio | Propósito | Compartido |
|---|---|---|---|---|
| Información personal | Nombre | Sí | Funcionalidad de la app, gestión de la cuenta | No |
| Información personal | Dirección de correo | Sí | Funcionalidad de la app, gestión de la cuenta, comunicaciones | No |
| Información personal | Número de teléfono | Sí | Funcionalidad de la app, gestión de la cuenta | No |
| Información personal | ID de usuario (id de cuenta) | Sí | Gestión de la cuenta | No |
| Información financiera | Otra información financiera (comprobante de pago que el usuario sube) | Sí, para inscribirse | Funcionalidad de la app (verificar la inscripción) | No |
| Fotos y videos | Fotos (perfil, logotipo, comprobantes) | No | Funcionalidad de la app | No |
| Mensajes | Otros mensajes dentro de la app | No | Funcionalidad de la app | No |
| Información y rendimiento de la app | Registros de fallos / diagnósticos | Sí (automático) | Análisis (diagnóstico de errores) | No |
| Dispositivo u otros ID | Token de notificaciones push | No (si activa notificaciones) | Funcionalidad de la app, comunicaciones | No |

## Datos que NO se recopilan
Ubicación, contactos, calendario, audio, video, historial de navegación, salud, datos de pago con tarjeta, identificadores publicitarios.

## Notas para el formulario
- **Terceros / proveedores:** el token de notificaciones se procesa a través del servicio de notificaciones de Expo y Google (Firebase Cloud Messaging) y el servidor aloja los datos. Play considera esto *procesamiento por proveedores de servicio*, que no cuenta como "compartir".
- **Visibilidad entre usuarios:** el perfil comercial de una empresa es visible para otras empresas participantes dentro de la app; eso es contenido que el propio usuario publica, no una transferencia a terceros.
- **Cámara:** se usa únicamente para escanear códigos QR (equipo técnico) y tomar fotos si el usuario lo elige; no se guardan imágenes de la cámara salvo que el usuario las suba. No hay grabación de audio.
- **Retención:** los datos de las empresas se guardan para futuras ediciones de la Rueda de Negocios; el usuario puede pedir la eliminación en cualquier momento.
