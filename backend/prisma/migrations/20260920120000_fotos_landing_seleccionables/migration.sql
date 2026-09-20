ALTER TABLE "fotoevento" ADD COLUMN "visibleLanding" SMALLINT NOT NULL DEFAULT 0;

CREATE INDEX "fotoevento_evento_id_visibleLanding_idx" ON "fotoevento"("evento_id", "visibleLanding");

-- El landing publico ya no filtra automaticamente por rol de quien subio la
-- foto ("soloTecnicos"): ahora un admin/tecnico la selecciona a mano. Para que
-- el landing no quede vacio tras este despliegue, se migran como ya
-- seleccionadas las fotos activas que antes se mostraban ahi.
UPDATE "fotoevento"
SET "visibleLanding" = 1
WHERE "estaActivo" = 1
  AND "usuario_id" IN (
    SELECT "id" FROM "usuario" WHERE "rolEvento" IN ('TECNICO', 'TECNICO_EVENTOS') AND "estaActivo" = 1
  );
