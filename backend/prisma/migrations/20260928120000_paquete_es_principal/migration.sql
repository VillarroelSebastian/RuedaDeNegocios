-- Solo aplica a paquetes FORO: cuál se usa para mostrar precio/QR únicos en
-- Admin > Foro · Personal cuando hay más de un paquete FORO en el evento.
ALTER TABLE "paquete" ADD COLUMN "esPrincipal" SMALLINT NOT NULL DEFAULT 0;
