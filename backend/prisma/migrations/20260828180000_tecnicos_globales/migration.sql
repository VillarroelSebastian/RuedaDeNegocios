-- Los técnicos administran siempre el evento principal activo. Se elimina la
-- asignación heredada a un evento concreto sin borrar cuentas ni historial.
UPDATE "usuario"
SET "evento_id" = NULL,
    "creadoModificadoFecha" = CURRENT_TIMESTAMP
WHERE "rolEvento" IN ('TECNICO', 'TECNICO_EVENTOS')
  AND "evento_id" IS NOT NULL;
