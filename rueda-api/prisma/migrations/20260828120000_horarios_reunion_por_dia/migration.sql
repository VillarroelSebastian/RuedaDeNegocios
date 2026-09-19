-- Horarios de reuniones separados de la duraciÃ³n general del evento.
-- Son opcionales para mantener compatibles los eventos e inscripciones previos.
ALTER TABLE "evento"
  ADD COLUMN "horariosReunionJson" TEXT;

ALTER TABLE "empresaevento"
  ADD COLUMN "horariosDisponibilidadJson" TEXT;
