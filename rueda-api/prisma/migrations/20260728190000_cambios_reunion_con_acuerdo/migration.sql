CREATE TABLE IF NOT EXISTS "cambioreunion" (
    "id" SERIAL NOT NULL,
    "reunion_id" INTEGER NOT NULL,
    "solicitadoPorEe_id" INTEGER NOT NULL,
    "tipoReunion" VARCHAR(45) NOT NULL,
    "fechaHoraInicio" TIMESTAMP(6) NOT NULL,
    "fechaHoraFin" TIMESTAMP(6) NOT NULL,
    "mesa_id" INTEGER,
    "enlaceReunionVirtual" VARCHAR(500),
    "mensaje" VARCHAR(505),
    "estado" VARCHAR(45) NOT NULL DEFAULT 'PENDIENTE',
    "motivoRechazo" VARCHAR(505),
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),
    CONSTRAINT "cambioreunion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cambioreunion_reunion_id_estado_idx" ON "cambioreunion"("reunion_id", "estado");
CREATE INDEX IF NOT EXISTS "cambioreunion_solicitadoPorEe_id_idx" ON "cambioreunion"("solicitadoPorEe_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cambioreunion_reunion_id_fkey') THEN
    ALTER TABLE "cambioreunion" ADD CONSTRAINT "cambioreunion_reunion_id_fkey"
    FOREIGN KEY ("reunion_id") REFERENCES "reunion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;
