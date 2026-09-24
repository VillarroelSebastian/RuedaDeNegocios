CREATE TABLE "mensajeinterno" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "autorNombre" VARCHAR(155) NOT NULL,
    "autorRol" VARCHAR(20) NOT NULL,
    "contenido" VARCHAR(1000) NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajeinterno_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mensajeinterno_evento_id_estaActivo_idx" ON "mensajeinterno"("evento_id", "estaActivo");

ALTER TABLE "mensajeinterno" ADD CONSTRAINT "mensajeinterno_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
