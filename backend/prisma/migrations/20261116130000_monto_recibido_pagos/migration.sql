-- Control real del dinero: monto esperado del paquete cuando lo recibido difiere.
ALTER TABLE "empresaevento" ADD COLUMN "montoEsperado" DECIMAL(10,2);
ALTER TABLE "empresaeventocomprobantes" ADD COLUMN "montoEsperado" DECIMAL(10,2);
