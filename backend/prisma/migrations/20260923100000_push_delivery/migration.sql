CREATE TABLE "pushdelivery" (
  "id" SERIAL PRIMARY KEY,
  "subscriptionId" INTEGER NOT NULL REFERENCES "pushsubscription"("id") ON DELETE CASCADE,
  "contenido" JSONB NOT NULL, "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  "intentos" INTEGER NOT NULL DEFAULT 0, "proximoIntento" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ticketId" VARCHAR(100), "error" VARCHAR(255),
  "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "pushdelivery_estado_proximoIntento_idx" ON "pushdelivery"("estado","proximoIntento");
