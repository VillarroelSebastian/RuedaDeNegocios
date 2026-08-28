-- Las reuniones virtuales no deben consumir una mesa fisica.
ALTER TABLE reunion ALTER COLUMN mesa_id DROP NOT NULL;
ALTER TABLE reunion ADD COLUMN IF NOT EXISTS "fechaHoraInicioReal" TIMESTAMP(6);
ALTER TABLE reunion ADD COLUMN IF NOT EXISTS "fechaHoraFinReal" TIMESTAMP(6);

-- Alertas operativas persistentes para el equipo del evento.
CREATE TABLE IF NOT EXISTS notificacionstaff (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER NOT NULL REFERENCES evento(id),
  "tituloNotificacion" VARCHAR(300) NOT NULL,
  "mensajeNotificacion" VARCHAR(500) NOT NULL,
  "tipoNotificacion" VARCHAR(55) NOT NULL,
  "referenciaId" INTEGER NOT NULL,
  "referenciaNombreTabla" VARCHAR(65) NOT NULL,
  urgente SMALLINT NOT NULL DEFAULT 0,
  "estaActivo" SMALLINT NOT NULL DEFAULT 1,
  "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notificacionstaff_evento_activo_fecha_idx
  ON notificacionstaff(evento_id, "estaActivo", "fechaCreacion" DESC);
CREATE INDEX IF NOT EXISTS notificacionstaff_tipo_referencia_idx
  ON notificacionstaff("tipoNotificacion", "referenciaId");

-- Reserva atomica de una mesa desde que la solicitud presencial queda pendiente.
-- Se usa un advisory lock por mesa para serializar solicitudes simultaneas. A
-- diferencia de una exclusion constraint, el trigger puede instalarse aunque
-- existan solicitudes historicas en conflicto y protege todas las nuevas.
CREATE OR REPLACE FUNCTION validar_reserva_mesa_solicitud() RETURNS trigger AS $$
BEGIN
  IF NEW."estaActivo" = 1
     AND NEW."estadoSolicitud" = 'PENDIENTE'
     AND NEW."tipoReunion" = 'PRESENCIAL'
     AND NEW.mesa_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(78421, NEW.mesa_id);

    IF EXISTS (
      SELECT 1
      FROM solicitudreunion s
      WHERE s.id <> COALESCE(NEW.id, 0)
        AND s."estaActivo" = 1
        AND s."estadoSolicitud" = 'PENDIENTE'
        AND s."tipoReunion" = 'PRESENCIAL'
        AND s.mesa_id = NEW.mesa_id
        AND s."fechaHoraInicioPropuesta" < NEW."fechaHoraFinPropuesta"
        AND s."fechaHoraFinPropuesta" > NEW."fechaHoraInicioPropuesta"
    ) OR EXISTS (
      SELECT 1
      FROM reunion r
      WHERE r."estaActivo" = 1
        AND r."estadoReunion" <> 'CANCELADA'
        AND r.mesa_id = NEW.mesa_id
        AND r."fechaHoraInicioReunion" < NEW."fechaHoraFinPropuesta"
        AND r."fechaHoraFinReunion" > NEW."fechaHoraInicioPropuesta"
    ) THEN
      RAISE EXCEPTION 'La mesa seleccionada acaba de ser reservada. Elige otra mesa.' USING ERRCODE = '23P01';
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS solicitud_reserva_mesa_trigger ON solicitudreunion;
CREATE TRIGGER solicitud_reserva_mesa_trigger
BEFORE INSERT OR UPDATE OF mesa_id, "fechaHoraInicioPropuesta", "fechaHoraFinPropuesta", "estadoSolicitud", "estaActivo"
ON solicitudreunion FOR EACH ROW EXECUTE FUNCTION validar_reserva_mesa_solicitud();

CREATE INDEX IF NOT EXISTS solicitudreunion_reserva_mesa_idx
  ON solicitudreunion(mesa_id, "fechaHoraInicioPropuesta", "fechaHoraFinPropuesta")
  WHERE "estaActivo" = 1 AND "estadoSolicitud" = 'PENDIENTE' AND "tipoReunion" = 'PRESENCIAL';
