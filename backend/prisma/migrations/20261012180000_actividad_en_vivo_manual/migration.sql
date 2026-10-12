-- Cronograma en vivo automático: 1 = el staff movió el estado a mano y el sistema
-- ya no la pone en vivo solo. Las actividades existentes quedan en automático.
ALTER TABLE "actividadprograma" ADD COLUMN "enVivoManual" SMALLINT NOT NULL DEFAULT 0;
