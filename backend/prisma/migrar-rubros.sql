-- Migración de rubros antiguos a los 12 sectores productivos del Beni.
-- El mapa RUBROS_COMPLEMENTARIOS compara nombres exactos: con los rubros
-- viejos la afinidad quedaba nula y no se recomendaban socios.
BEGIN;

-- 1) rubro: coincidencia exacta, sin riesgo de subcadenas.
UPDATE empresa SET rubro = CASE rubro
  WHEN 'Gastronomía y Turismo' THEN 'Turismo'
  WHEN 'Artesanía y Cultura' THEN 'Turismo'
  WHEN 'Transporte y Logística' THEN 'Logística, Transporte y Comercio Exterior'
  WHEN 'Comercio y Distribución' THEN 'Logística, Transporte y Comercio Exterior'
  WHEN 'Agropecuario y Ganadería' THEN 'Ganadería y Producción Pecuaria'
  WHEN 'Ganadería' THEN 'Ganadería y Producción Pecuaria'
  WHEN 'Agropecuaria' THEN 'Agricultura y Producción de Granos'
  WHEN 'Alimentos' THEN 'Agroindustria'
  WHEN 'Madera y Forestal' THEN 'Forestal y Maderero'
  WHEN 'Finanzas y Seguros' THEN 'Servicios Financieros e Inversión'
  WHEN 'Finanzas' THEN 'Servicios Financieros e Inversión'
  WHEN 'Educación y Capacitación' THEN 'Servicios Empresariales'
  WHEN 'Servicios Profesionales' THEN 'Servicios Empresariales'
  WHEN 'Salud y Bienestar' THEN 'Servicios Empresariales'
  WHEN 'Inmobiliario' THEN 'Servicios Empresariales'
  WHEN 'Tecnología e Innovación' THEN 'Energía y Tecnología'
  WHEN 'Medio Ambiente y Energía' THEN 'Energía y Tecnología'
  WHEN 'Tecnología' THEN 'Energía y Tecnología'
  WHEN 'Construcción e Infraestructura' THEN 'Industria y Manufactura'
  WHEN 'Construcción' THEN 'Industria y Manufactura'
  WHEN 'Minería e Hidrocarburos' THEN 'Industria y Manufactura'
  ELSE rubro END
WHERE "estaActivo" = 1;

-- 2) interesesBusqueda: lista separada por comas, se reemplaza por subcadena.
--    Se ordena de clave más larga a más corta para que "Ganadería" no
--    corrompa "Agropecuario y Ganadería" ni "Finanzas" a "Finanzas y Seguros".
UPDATE empresa SET "interesesBusqueda" = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("interesesBusqueda", 'Construcción e Infraestructura', 'Industria y Manufactura'), 'Agropecuario y Ganadería', 'Ganadería y Producción Pecuaria'), 'Educación y Capacitación', 'Servicios Empresariales'), 'Medio Ambiente y Energía', 'Energía y Tecnología'), 'Comercio y Distribución', 'Logística, Transporte y Comercio Exterior'), 'Servicios Profesionales', 'Servicios Empresariales'), 'Tecnología e Innovación', 'Energía y Tecnología'), 'Minería e Hidrocarburos', 'Industria y Manufactura'), 'Transporte y Logística', 'Logística, Transporte y Comercio Exterior'), 'Gastronomía y Turismo', 'Turismo'), 'Artesanía y Cultura', 'Turismo'), 'Finanzas y Seguros', 'Servicios Financieros e Inversión'), 'Madera y Forestal', 'Forestal y Maderero'), 'Salud y Bienestar', 'Servicios Empresariales'), 'Agropecuaria', 'Agricultura y Producción de Granos'), 'Inmobiliario', 'Servicios Empresariales'), 'Construcción', 'Industria y Manufactura'), 'Tecnología', 'Energía y Tecnología'), 'Ganadería', 'Ganadería y Producción Pecuaria'), 'Alimentos', 'Agroindustria'), 'Finanzas', 'Servicios Financieros e Inversión')
WHERE "estaActivo" = 1 AND "interesesBusqueda" IS NOT NULL;

COMMIT;
