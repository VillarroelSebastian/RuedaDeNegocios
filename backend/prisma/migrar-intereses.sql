-- Sectores de interes: se mapea cada elemento COMPLETO de la lista.
-- El intento anterior uso REPLACE por subcadena y volvia a sustituir dentro
-- de su propio resultado ("Ganaderia y Produccion Pecuaria y Produccion Pecuaria").
BEGIN;
UPDATE empresa SET "interesesBusqueda" = 'Ganadería y Producción Pecuaria, Logística, Transporte y Comercio Exterior' WHERE id = 31;
UPDATE empresa SET "interesesBusqueda" = 'Logística, Transporte y Comercio Exterior, Ganadería y Producción Pecuaria, Industria y Manufactura' WHERE id = 33;
UPDATE empresa SET "interesesBusqueda" = 'Energía y Tecnología' WHERE id = 34;
UPDATE empresa SET "interesesBusqueda" = 'Ganadería y Producción Pecuaria' WHERE id = 35;
UPDATE empresa SET "interesesBusqueda" = 'Ganadería y Producción Pecuaria' WHERE id = 38;
COMMIT;
