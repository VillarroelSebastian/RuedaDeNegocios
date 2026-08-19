CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS auditoria (
  id BIGSERIAL PRIMARY KEY,
  usuario_id INTEGER NULL,
  rol VARCHAR(45) NOT NULL,
  accion VARCHAR(255) NOT NULL,
  ruta VARCHAR(500) NOT NULL,
  metodo VARCHAR(10) NOT NULL,
  ip VARCHAR(64),
  detalles TEXT,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS auditoria_usuario_fecha_idx ON auditoria(usuario_id, fecha_creacion DESC);

CREATE TABLE IF NOT EXISTS intento_auth (
  id BIGSERIAL PRIMARY KEY,
  clave CHAR(64) NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS intento_auth_clave_fecha_idx ON intento_auth(clave, fecha DESC);

CREATE UNIQUE INDEX IF NOT EXISTS usuario_correo_activo_unique
  ON usuario (LOWER(correo)) WHERE "estaActivo" = 1;
CREATE UNIQUE INDEX IF NOT EXISTS empresa_correo_activo_unique
  ON empresa (LOWER("correoCorporativo")) WHERE "estaActivo" = 1;
CREATE UNIQUE INDEX IF NOT EXISTS empresa_evento_activo_unique
  ON empresaevento (empresa_id, evento_id) WHERE "estaActivo" = 1;
CREATE UNIQUE INDEX IF NOT EXISTS empresa_usuario_participacion_unique
  ON empresa_usuario (usuario_id, empresaevento_id) WHERE "estaActivo" = 1;
CREATE UNIQUE INDEX IF NOT EXISTS resultado_por_empresa_reunion_unique
  ON resultadoreunion (reunion_id, "empresaeventoCalificadora_id") WHERE "estaActivo" = 1;
CREATE UNIQUE INDEX IF NOT EXISTS mesa_numero_evento_unique
  ON mesa (evento_id, "numeroMesa");
CREATE UNIQUE INDEX IF NOT EXISTS solicitud_repetida_activa_unique
  ON solicitudreunion ("empresaEvento_id", "empresaEventorReceptora_id", "fechaHoraInicioPropuesta")
  WHERE "estaActivo" = 1 AND "estadoSolicitud" <> 'CANCELADA';

ALTER TABLE reunion DROP CONSTRAINT IF EXISTS reunion_mesa_sin_solapamiento;
ALTER TABLE reunion ADD CONSTRAINT reunion_mesa_sin_solapamiento
  EXCLUDE USING gist (mesa_id WITH =, tsrange("fechaHoraInicioReunion", "fechaHoraFinReunion", '[)') WITH &&)
  WHERE ("estaActivo" = 1 AND "estadoReunion" <> 'CANCELADA');

ALTER TABLE resultadoreunion DROP CONSTRAINT IF EXISTS resultado_calificacion_valida;
ALTER TABLE resultadoreunion ADD CONSTRAINT resultado_calificacion_valida CHECK ("calificacionReunion" BETWEEN 1 AND 5);
ALTER TABLE solicitudreunion DROP CONSTRAINT IF EXISTS solicitud_empresas_distintas;
ALTER TABLE solicitudreunion ADD CONSTRAINT solicitud_empresas_distintas CHECK ("empresaEvento_id" <> "empresaEventorReceptora_id");

-- Serializa la agenda de cada empresa y evita dos reuniones simultáneas,
-- incluso si dos solicitudes se aceptan desde procesos distintos.
CREATE OR REPLACE FUNCTION validar_agenda_empresas() RETURNS trigger AS $$
DECLARE empresa_a INTEGER; empresa_b INTEGER;
BEGIN
  SELECT "empresaEvento_id", "empresaEventorReceptora_id" INTO empresa_a, empresa_b
    FROM solicitudreunion WHERE id = NEW."solicitudReunion_id";
  PERFORM pg_advisory_xact_lock(LEAST(empresa_a, empresa_b));
  PERFORM pg_advisory_xact_lock(GREATEST(empresa_a, empresa_b));
  IF EXISTS (
    SELECT 1 FROM reunion r JOIN solicitudreunion s ON s.id = r."solicitudReunion_id"
    WHERE r.id <> COALESCE(NEW.id, 0) AND r."estaActivo" = 1 AND r."estadoReunion" <> 'CANCELADA'
      AND r."fechaHoraInicioReunion" < NEW."fechaHoraFinReunion"
      AND r."fechaHoraFinReunion" > NEW."fechaHoraInicioReunion"
      AND (s."empresaEvento_id" IN (empresa_a, empresa_b) OR s."empresaEventorReceptora_id" IN (empresa_a, empresa_b))
  ) THEN RAISE EXCEPTION 'Una empresa ya tiene una reunión en ese horario' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS reunion_agenda_empresas_trigger ON reunion;
CREATE TRIGGER reunion_agenda_empresas_trigger BEFORE INSERT OR UPDATE OF "fechaHoraInicioReunion", "fechaHoraFinReunion", "estadoReunion", "estaActivo"
ON reunion FOR EACH ROW EXECUTE FUNCTION validar_agenda_empresas();

ALTER TABLE empresaevento DROP CONSTRAINT IF EXISTS empresaevento_estado_pago_valido;
ALTER TABLE empresaevento ADD CONSTRAINT empresaevento_estado_pago_valido CHECK ("estadoVerificacionPago" IN ('PENDIENTE','OBSERVADO','PROCESANDO','COMPLETADO','APROBADO','RECHAZADO'));
ALTER TABLE solicitudreunion DROP CONSTRAINT IF EXISTS solicitud_estado_valido;
ALTER TABLE solicitudreunion ADD CONSTRAINT solicitud_estado_valido CHECK ("estadoSolicitud" IN ('PENDIENTE','ACEPTADA','RECHAZADA','CANCELADA'));
