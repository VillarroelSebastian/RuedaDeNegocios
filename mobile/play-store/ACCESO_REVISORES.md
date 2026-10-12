# Acceso para los revisores (Play Console › Contenido de la app › Acceso a la app)

Elige **"Toda o parte de mi app está restringida"** y pega este texto. Reemplaza `<CONTRASEÑA>` por la que te mostró el script `prisma/cuentas-demo.ts` (no la guardes en el repositorio).

---

**Instrucciones de acceso**

La app requiere iniciar sesión. Usa estas cuentas de demostración (empresa participante de un evento de negocios):

- Encargado de empresa — correo: `revision.encargado@demo-rueda.test` — contraseña: `<CONTRASEÑA>`
- Participante (miembro del equipo, rol limitado) — correo: `revision.participante@demo-rueda.test` — contraseña: `<CONTRASEÑA>`

Qué probar con el **Encargado**:
1. Inicio de sesión → panel de inicio.
2. *Empresas*: directorio de empresas del evento. Para probar una solicitud de reunión usa la empresa **"Empresa Demo Socio"**.
3. *Agenda › Reuniones*: solicitudes, reuniones y la pestaña *Cambios*.
4. *Cronograma*, *Comunicados* y *Mensajes* (equipo del evento).
5. *Perfil*: datos de la empresa, credencial QR, **Eliminar mi cuenta** y **Política de privacidad**.

Con el **Participante** se ve la versión limitada: solo su agenda de reuniones y el asistente.

Notas:
- Las funciones del equipo organizador (administrador y técnico, que incluyen el escaneo de credenciales QR con la cámara) están restringidas al personal del evento; por eso no se entregan credenciales para esos roles. El permiso de cámara se declara por esa función de escaneo de QR.
- La app no ofrece compras dentro de la aplicación: el pago de inscripción al evento se hace fuera de la app (transferencia por QR bancario) y el usuario solo sube el comprobante.
- La eliminación de cuenta está en *Perfil › Eliminar mi cuenta* (pide la contraseña). Si la usas con la cuenta demo, avísanos para restablecerla.

---

## Si quieres dar acceso también al equipo técnico
No se creó una cuenta técnica a propósito: un técnico ve datos reales de las empresas. Si Google lo exige, crea un técnico temporal desde Admin › Técnicos, indícalo en las instrucciones y desactívalo al terminar la revisión. También puedes grabar un video corto del escaneo de QR y subirlo en la declaración del permiso de cámara.

## Al terminar la revisión
Desactiva las cuentas demo (baja lógica) en el servidor:
```
cd /var/www/rueda/backend
npx tsx prisma/cuentas-demo.ts --desactivar
```
