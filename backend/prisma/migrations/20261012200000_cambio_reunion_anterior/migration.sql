-- Instantánea de la reunión al proponer un cambio, para mostrar "antes" y "ahora" en el historial.
ALTER TABLE "cambioreunion" ADD COLUMN "inicioAnterior" TIMESTAMP(6);
ALTER TABLE "cambioreunion" ADD COLUMN "finAnterior" TIMESTAMP(6);
ALTER TABLE "cambioreunion" ADD COLUMN "tipoAnterior" VARCHAR(45);
ALTER TABLE "cambioreunion" ADD COLUMN "mesaAnterior_id" INTEGER;
