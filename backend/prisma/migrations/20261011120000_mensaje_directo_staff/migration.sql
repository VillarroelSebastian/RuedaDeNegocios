-- Mensajes 1 a 1 entre miembros del equipo (administradores y técnicos).
-- destinatario_id NULL = mensaje del chat compartido del equipo (sin cambios).
-- Los mensajes existentes quedan como "leídos" (valor por defecto 1).
ALTER TABLE "mensajeinterno" ADD COLUMN "destinatario_id" INTEGER;
ALTER TABLE "mensajeinterno" ADD COLUMN "haSidoLeido" SMALLINT NOT NULL DEFAULT 1;
CREATE INDEX "mensajeinterno_evento_id_destinatario_id_idx" ON "mensajeinterno"("evento_id", "destinatario_id");
