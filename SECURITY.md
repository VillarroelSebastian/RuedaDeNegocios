# Seguridad y operación

## Controles activos

- Toda ruta es privada salvo la lista explícita de `AuthGuard`.
- Las rutas privadas requieren `Authorization: Bearer <JWT>` y validan rol y pertenencia a empresa.
- Los enlaces de seguimiento y credenciales públicas incluyen tokens HMAC no enumerables.
- Socket.IO autentica el JWT durante el handshake y asigna salas desde la base de datos.
- Las escrituras quedan registradas en `auditoria`; `GET /admin/auditoria` permite consultarlas.
- Los archivos se validan por tamaño, MIME, firma y dimensiones. Los PDF se sirven como descarga.

## Variables obligatorias en producción

`JWT_SECRET` debe tener al menos 32 caracteres. También deben definirse `DATABASE_URL`,
`WEB_URL`, `PUBLIC_URL`, `CORS_ORIGINS`, `MAIL_USER`, `MAIL_PASS` y `MAIL_FROM`.
El backend usa `BIND_ADDRESS=127.0.0.1`; solo Nginx publica la aplicación.

## Migraciones

El historial comienza en `20260701000000_baseline`. Las instalaciones antiguas creadas
con `prisma db push` son baselined automáticamente por `deploy/setup-vps.sh`. El despliegue
se detiene si encuentra correos activos duplicados, porque decidir qué cuenta conservar
requiere revisión humana. Después aplica `prisma migrate deploy`.

## Respaldo y secretos

No se guardan dumps ni archivos `.env` en el repositorio. Los respaldos deben almacenarse
cifrados fuera del árbol de trabajo y con acceso restringido. Si un respaldo estuvo expuesto,
se deben rotar contraseñas, credenciales de correo, `JWT_SECRET` y claves de base de datos.

## Verificación antes de publicar

```powershell
cd backend
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand

cd ../web
npm.cmd run build

cd ../mobile
npx.cmd tsc --noEmit
```
