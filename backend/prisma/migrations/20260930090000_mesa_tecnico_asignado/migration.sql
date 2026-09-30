-- Permite asignar un técnico responsable a cada mesa; se le notifica al asignarlo.
ALTER TABLE "mesa" ADD COLUMN "tecnicoAsignado_id" INTEGER;
ALTER TABLE "mesa" ADD CONSTRAINT "fk_mesa_tecnico1" FOREIGN KEY ("tecnicoAsignado_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
CREATE INDEX "fk_mesa_tecnico1_idx" ON "mesa"("tecnicoAsignado_id");
