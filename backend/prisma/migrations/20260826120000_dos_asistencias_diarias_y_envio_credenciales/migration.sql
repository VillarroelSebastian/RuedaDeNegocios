-- Estado auditable del envío de credenciales técnicas.
ALTER TABLE "usuario"
  ADD COLUMN "ultimoEnvioCredenciales" TIMESTAMP(6),
  ADD COLUMN "estadoUltimoEnvioCredenciales" VARCHAR(20),
  ADD COLUMN "errorUltimoEnvioCredenciales" VARCHAR(505);

-- Cada credencial puede registrar entrada y salida (dos usos) por día del evento.
ALTER TABLE "asistenciaevento"
  ADD COLUMN "fechaAsistencia" DATE,
  ADD COLUMN "numeroUso" SMALLINT;

UPDATE "asistenciaevento"
SET "fechaAsistencia" = ("fechaHoraAsistencia" - INTERVAL '4 hours')::date,
    "numeroUso" = 1;

ALTER TABLE "asistenciaevento"
  ALTER COLUMN "fechaAsistencia" SET NOT NULL,
  ALTER COLUMN "numeroUso" SET NOT NULL,
  ADD CONSTRAINT "asistenciaevento_numeroUso_check" CHECK ("numeroUso" BETWEEN 1 AND 2);

DROP INDEX IF EXISTS "asistenciaevento_evento_id_empresa_usuario_id_key";
CREATE UNIQUE INDEX "asist_evento_empresa_fecha_uso_key"
  ON "asistenciaevento"("evento_id", "empresa_usuario_id", "fechaAsistencia", "numeroUso");
CREATE INDEX "asist_evento_empresa_fecha_idx"
  ON "asistenciaevento"("evento_id", "empresa_usuario_id", "fechaAsistencia");

ALTER TABLE "asistenciaauspiciador"
  ADD COLUMN "fechaAsistencia" DATE,
  ADD COLUMN "numeroUso" SMALLINT;

UPDATE "asistenciaauspiciador"
SET "fechaAsistencia" = ("fechaHoraAsistencia" - INTERVAL '4 hours')::date,
    "numeroUso" = 1;

ALTER TABLE "asistenciaauspiciador"
  ALTER COLUMN "fechaAsistencia" SET NOT NULL,
  ALTER COLUMN "numeroUso" SET NOT NULL,
  ADD CONSTRAINT "asistenciaauspiciador_numeroUso_check" CHECK ("numeroUso" BETWEEN 1 AND 2);

DROP INDEX IF EXISTS "asistenciaauspiciador_evento_id_auspiciadorpersona_id_key";
CREATE UNIQUE INDEX "asist_ausp_evento_persona_fecha_uso_key"
  ON "asistenciaauspiciador"("evento_id", "auspiciadorpersona_id", "fechaAsistencia", "numeroUso");
CREATE INDEX "asist_ausp_evento_persona_fecha_idx"
  ON "asistenciaauspiciador"("evento_id", "auspiciadorpersona_id", "fechaAsistencia");
