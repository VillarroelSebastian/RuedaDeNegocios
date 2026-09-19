ALTER TABLE "empresa_usuario"
  ADD COLUMN "nombresEvento" VARCHAR(105),
  ADD COLUMN "apellidoPaternoEvento" VARCHAR(65),
  ADD COLUMN "apellidoMaternoEvento" VARCHAR(65),
  ADD COLUMN "telefonoEvento" VARCHAR(45);

-- Hasta esta version los datetime-local de apertura/cierre se guardaban como
-- UTC aunque el administrador los escribia en hora boliviana (UTC-4).
UPDATE "evento"
SET
  "fechaInicioSolicitudes" = CASE WHEN "fechaInicioSolicitudes" IS NULL THEN NULL ELSE "fechaInicioSolicitudes" + INTERVAL '4 hours' END,
  "fechaFinSolicitudes" = CASE WHEN "fechaFinSolicitudes" IS NULL THEN NULL ELSE "fechaFinSolicitudes" + INTERVAL '4 hours' END;

-- Los valores nulos conservan compatibilidad con inscripciones anteriores:
-- la aplicacion usa como respaldo los datos globales de usuario.
