CREATE TABLE "asistenciaauspiciador" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "auspiciadorpersona_id" INTEGER NOT NULL,
    "tecnico_id" INTEGER NOT NULL,
    "fechaHoraAsistencia" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    CONSTRAINT "asistenciaauspiciador_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "asistenciaauspiciador_evento_id_auspiciadorpersona_id_key"
ON "asistenciaauspiciador"("evento_id", "auspiciadorpersona_id");
CREATE INDEX "asistenciaauspiciador_evento_id_fechaHoraAsistencia_idx"
ON "asistenciaauspiciador"("evento_id", "fechaHoraAsistencia");
CREATE INDEX "asistenciaauspiciador_tecnico_id_idx"
ON "asistenciaauspiciador"("tecnico_id");

ALTER TABLE "asistenciaauspiciador" ADD CONSTRAINT "asistenciaauspiciador_evento_id_fkey"
FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "asistenciaauspiciador" ADD CONSTRAINT "asistenciaauspiciador_auspiciadorpersona_id_fkey"
FOREIGN KEY ("auspiciadorpersona_id") REFERENCES "auspiciadorpersona"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "asistenciaauspiciador" ADD CONSTRAINT "asistenciaauspiciador_tecnico_id_fkey"
FOREIGN KEY ("tecnico_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
