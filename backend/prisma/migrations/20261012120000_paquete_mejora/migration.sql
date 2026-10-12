-- Mejora de paquete definida entre dos paquetes (origen -> destino), con costo y QR propios.
CREATE TABLE "paquetemejora" (
    "id" SERIAL NOT NULL,
    "origen_id" INTEGER NOT NULL,
    "destino_id" INTEGER NOT NULL,
    "costo" DECIMAL(10,2) NOT NULL,
    "urlQR" VARCHAR(505) NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),
    CONSTRAINT "paquetemejora_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "paquetemejora_origen_id_idx" ON "paquetemejora"("origen_id");
CREATE INDEX "paquetemejora_destino_id_idx" ON "paquetemejora"("destino_id");
ALTER TABLE "paquetemejora" ADD CONSTRAINT "paquetemejora_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "paquete"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "paquetemejora" ADD CONSTRAINT "paquetemejora_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "paquete"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Si ya había mejoras configuradas en el paquete destino (costoMejora/urlQRMejora),
-- se crean desde cada paquete EMPRESA más barato del mismo evento.
INSERT INTO "paquetemejora" ("origen_id", "destino_id", "costo", "urlQR")
SELECT o."id", d."id", d."costoMejora", d."urlQRMejora"
FROM "paquete" d
JOIN "paquete" o ON o."evento_id" = d."evento_id" AND o."tipoPaquete" = 'EMPRESA' AND o."estaActivo" = 1 AND o."costo" < d."costo"
WHERE d."tipoPaquete" = 'EMPRESA' AND d."estaActivo" = 1 AND d."costoMejora" IS NOT NULL AND d."urlQRMejora" IS NOT NULL;
