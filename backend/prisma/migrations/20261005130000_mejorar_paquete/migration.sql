-- "Mejorar paquete": costo/QR intermedio por paquete, y a qué paquete apunta
-- un comprobante de tipo MEJORA.
ALTER TABLE "paquete" ADD COLUMN "costoMejora" DECIMAL(10,2);
ALTER TABLE "paquete" ADD COLUMN "urlQRMejora" VARCHAR(505);

ALTER TABLE "empresaeventocomprobantes" ADD COLUMN "paqueteDestino_id" INTEGER;
CREATE INDEX "fk_empresaeventocomprobantes_paquete1_idx" ON "empresaeventocomprobantes"("paqueteDestino_id");
ALTER TABLE "empresaeventocomprobantes" ADD CONSTRAINT "fk_empresaeventocomprobantes_paquete1" FOREIGN KEY ("paqueteDestino_id") REFERENCES "paquete"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
