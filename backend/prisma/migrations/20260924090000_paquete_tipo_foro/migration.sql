-- Añade tipoPaquete a paquete (EMPRESA | FORO) para distinguir paquetes de
-- inscripción normal de los paquetes de inscripción individual "foro".
ALTER TABLE "paquete" ADD COLUMN "tipoPaquete" VARCHAR(20) NOT NULL DEFAULT 'EMPRESA';
