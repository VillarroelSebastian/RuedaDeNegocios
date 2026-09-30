-- Notificaciones dirigidas a un usuario específico del staff (p.ej. "se te
-- asignó la Mesa X") en vez del tablón compartido notificacionstaff, y un
-- marcador de "última vez que vio sus notificaciones" para calcular no leídas.
CREATE TABLE "notificacionpersonal" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tituloNotificacion" VARCHAR(300) NOT NULL,
    "mensajeNotificacion" VARCHAR(500) NOT NULL,
    "tipoNotificacion" VARCHAR(55) NOT NULL,
    "referenciaId" INTEGER NOT NULL,
    "referenciaNombreTabla" VARCHAR(65) NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacionpersonal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notificacionpersonal_usuario_id_estaActivo_fechaCreacion_idx" ON "notificacionpersonal"("usuario_id", "estaActivo", "fechaCreacion");

ALTER TABLE "notificacionpersonal" ADD CONSTRAINT "fk_notificacionpersonal_usuario1" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "usuario" ADD COLUMN "ultimaVistaNotificaciones" TIMESTAMP(6);
