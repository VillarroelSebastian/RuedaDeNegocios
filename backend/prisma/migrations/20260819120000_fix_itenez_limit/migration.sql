-- El paquete Iténez incluye exactamente dos credenciales. Los participantes
-- adicionales se habilitan únicamente mediante el flujo de pago adicional.
UPDATE "paquete"
SET "maxParticipantes" = 2,
    "credencialesIncluidas" = 2
WHERE LOWER("nombre") LIKE '%iténez%'
   OR LOWER("nombre") LIKE '%itenez%';
