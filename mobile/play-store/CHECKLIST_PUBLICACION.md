# Checklist de publicación en Google Play

## 1. Antes de compilar (ya hecho en el repositorio)
- [x] Permisos innecesarios bloqueados (audio, almacenamiento, superposición) y `allowBackup` desactivado.
- [x] Sesión guardada en almacenamiento seguro; sin logs con datos de usuario.
- [x] Eliminación de cuenta dentro de la app y en la web; política de privacidad pública.
- [x] `expo-doctor` 18/18; versión 1.2.0 (versionCode 18).

## 2. Compilar el AAB (producción)
```
cd mobile
eas build -p android --profile production
```
Requisitos en EAS: variable de archivo secreta `GOOGLE_SERVICES_JSON` (el `google-services.json` no está en git) y `EXPO_PUBLIC_API_URL` (ya está en `eas.json`). Descarga el `.aab` y súbelo a Play Console.
> Antes de volver a compilar, sube `versionCode` en `app.config.js` (cada subida a Play necesita uno mayor).

## 3. Contenido de la app (Play Console › Política › Contenido de la app)
- **Política de privacidad:** https://app.ruedadenegocios.univalle.edu/privacidad
- **Acceso a la app:** ver `ACCESO_REVISORES.md` (archivo local con las credenciales; no está en git). Correo de contacto para revisión: ruedadenegociosdelbeni@gmail.com.
- **Anuncios:** No contiene anuncios.
- **Público objetivo:** 18 años o más. No está dirigida a niños.
- **Clasificación de contenido (cuestionario IARC), categoría "Utilidad / Productividad / Comunicación u otra":**
  violencia, sexo, lenguaje fuerte, drogas, apuestas → **No**. Interacción entre usuarios → **Sí** (mensajes dentro de la app entre empresas y con el equipo). Comparte ubicación → **No**. Compras digitales → **No**.
- **Seguridad de los datos:** ver `SEGURIDAD_DATOS.md`.
- **Eliminación de cuenta:** URL https://app.ruedadenegocios.univalle.edu/eliminar-cuenta (y dentro de la app).
- **Permisos sensibles — Cámara:** se usa para escanear credenciales QR (equipo técnico) y tomar fotos si el usuario lo elige. Sin audio.
- **App de noticias / Gobierno / Salud / Finanzas:** No.
- **Funciones financieras:** la app no ofrece productos financieros; el pago de la inscripción se hace fuera de la app y solo se sube el comprobante.

## 4. Ficha
- Textos: `FICHA.md`. Gráficos: `assets/icono-512.png` y `assets/grafico-funciones-1024x500.png`.
- **Capturas de pantalla** (teléfono, mínimo 2, ideal 6–8, en vertical). Hazlas con la cuenta demo del encargado:
  1. Inicio de sesión
  2. Panel de inicio
  3. Directorio de empresas
  4. Solicitud de reunión
  5. Agenda › Reuniones
  6. Pestaña Cambios
  7. Cronograma en vivo
  8. Perfil y credencial QR

## 5. Pruebas antes de pasar a producción
- Prueba interna (hasta 100 testers) con el AAB, en al menos 2 teléfonos Android distintos (idealmente Android 13 y 15/16).
- Si la cuenta de desarrollador es **personal y nueva**: Play exige una prueba cerrada con 12 testers durante 14 días antes de producción. Si es de **organización**, no.
- Probar en dispositivo real: login por rol, notificaciones push con la app cerrada (y que al tocarlas abran la pantalla correcta), escaneo QR (técnico), subir foto/comprobante, solicitar y responder cambios de reunión, eliminar cuenta (con una cuenta de prueba, no la demo), red lenta, botón atrás y teclado.
- Revisar el informe previo al lanzamiento de Play (pre-launch report) y corregir fallos de arranque.

## 6. Después
- Desactivar las cuentas demo cuando Google termine la revisión (ver `ACCESO_REVISORES.md`).
- Revisar los errores de la app en el servidor: `pm2 logs rueda-backend | grep AppMovil`.
- Pendiente de mantenimiento: actualizar dependencias con vulnerabilidades conocidas (`npm audit`) en backend y web, en una rama aparte y con pruebas, porque la corrección automática rompe tests.
