CREATE TABLE "pushsubscription" (
  "id" SERIAL PRIMARY KEY, "usuarioId" INTEGER NOT NULL REFERENCES "usuario"("id") ON DELETE CASCADE,
  "clave" VARCHAR(64) NOT NULL UNIQUE, "tipo" VARCHAR(10) NOT NULL,
  "destino" TEXT NOT NULL, "p256dh" TEXT, "auth" TEXT,
  "actualizado" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "pushsubscription_usuarioId_idx" ON "pushsubscription"("usuarioId");
