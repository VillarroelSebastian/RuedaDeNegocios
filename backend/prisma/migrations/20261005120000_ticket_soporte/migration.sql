-- Ticket de soporte: una empresa solo puede tener un ticket ABIERTO a la vez.
-- El chat se sigue guardando en mensajeempresa (emisorEe_id=0); esta tabla
-- solo controla si ya hay uno abierto antes de dejar crear otro.
CREATE TABLE "ticketsoporte" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "empresaevento_id" INTEGER NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'ABIERTO',
    "fechaApertura" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(6),
    "cerradoPorUsuario_id" INTEGER,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT "ticketsoporte_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ticketsoporte_empresaevento_id_estado_idx" ON "ticketsoporte"("empresaevento_id", "estado");
CREATE INDEX "ticketsoporte_evento_id_estado_idx" ON "ticketsoporte"("evento_id", "estado");

ALTER TABLE "ticketsoporte" ADD CONSTRAINT "ticketsoporte_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ticketsoporte" ADD CONSTRAINT "ticketsoporte_empresaevento_id_fkey" FOREIGN KEY ("empresaevento_id") REFERENCES "empresaevento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ticketsoporte" ADD CONSTRAINT "ticketsoporte_cerradoPorUsuario_id_fkey" FOREIGN KEY ("cerradoPorUsuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
