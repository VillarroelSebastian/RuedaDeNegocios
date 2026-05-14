-- ─── 1. Update reunion dates to future (2026-05-20 – 2026-05-21) ───────────────
UPDATE reunion SET
  "fechaHoraInicioReunion" = '2026-05-20 09:00:00',
  "fechaHoraFinReunion"    = '2026-05-20 09:30:00'
WHERE id = 4;

UPDATE reunion SET
  "fechaHoraInicioReunion" = '2026-05-20 09:45:00',
  "fechaHoraFinReunion"    = '2026-05-20 10:15:00'
WHERE id = 5;

UPDATE reunion SET
  "fechaHoraInicioReunion" = '2026-05-20 10:00:00',
  "fechaHoraFinReunion"    = '2026-05-20 10:30:00'
WHERE id = 6;

UPDATE reunion SET
  "fechaHoraInicioReunion" = '2026-05-20 10:30:00',
  "fechaHoraFinReunion"    = '2026-05-20 11:00:00'
WHERE id = 7;

UPDATE reunion SET
  "fechaHoraInicioReunion" = '2026-05-20 11:00:00',
  "fechaHoraFinReunion"    = '2026-05-20 11:30:00'
WHERE id = 8;

UPDATE reunion SET
  "fechaHoraInicioReunion" = '2026-05-20 11:30:00',
  "fechaHoraFinReunion"    = '2026-05-20 12:00:00'
WHERE id = 9;

UPDATE reunion SET
  "fechaHoraInicioReunion" = '2026-05-20 14:00:00',
  "fechaHoraFinReunion"    = '2026-05-20 14:30:00'
WHERE id = 10;

UPDATE reunion SET
  "fechaHoraInicioReunion" = '2026-05-20 14:30:00',
  "fechaHoraFinReunion"    = '2026-05-20 15:00:00'
WHERE id = 11;

UPDATE reunion SET
  "fechaHoraInicioReunion" = '2026-05-21 09:00:00',
  "fechaHoraFinReunion"    = '2026-05-21 09:30:00'
WHERE id = 12;

UPDATE reunion SET
  "fechaHoraInicioReunion" = '2026-05-21 09:30:00',
  "fechaHoraFinReunion"    = '2026-05-21 10:00:00'
WHERE id = 13;

-- ─── 2. Publish the draft noticia & update dates ────────────────────────────────
UPDATE noticia SET
  "estadoPublicacion"    = 'PUBLICADO',
  "fechaHoraPublicacion" = '2026-05-14 08:00:00'
WHERE id = 3;

UPDATE noticia SET "fechaHoraPublicacion" = '2026-05-13 10:00:00' WHERE id = 1;
UPDATE noticia SET "fechaHoraPublicacion" = '2026-05-12 09:00:00' WHERE id = 2;

-- Insert additional noticias to have good test content
INSERT INTO noticia (evento_id, usuario_id, "tituloNoticia", "contenidoNoticia", "urlImagenNoticia", "tipoNoticia", "estadoPublicacion", "fechaHoraPublicacion", "estaActivo")
VALUES
  (6, 7,
   'Inauguración oficial de la Rueda de Negocios del Beni 2026',
   'Nos complace anunciar que la inauguración oficial del evento se realizará el 20 de mayo de 2026 en el Gran Hotel Asai de Trinidad. Contaremos con la presencia de autoridades departamentales, nacionales y empresarios de toda la región amazónica. El acto comenzará a las 9:00 AM con una bienvenida especial.',
   NULL,
   'EVENTO', 'PUBLICADO', '2026-05-14 07:00:00', 1),
  (6, 7,
   'Nuevas empresas confirmadas para participar en la Rueda 2026',
   'Tenemos el agrado de informar que se han sumado 15 nuevas empresas del sector agroindustrial y tecnológico para participar en la Rueda de Negocios 2026. Con estas incorporaciones, alcanzamos un total de 87 empresas participantes, superando el récord del año anterior.',
   NULL,
   'ACTUALIZACIÓN', 'PUBLICADO', '2026-05-11 14:30:00', 1),
  (6, 7,
   'Capacitación para representantes empresariales: técnicas de negociación',
   'Este viernes 17 de mayo se realizará un taller de técnicas de negociación efectiva para todos los representantes empresariales inscritos. La capacitación será de forma virtual a través de Zoom, de 15:00 a 18:00. Se enviará el enlace de acceso a los correos registrados.',
   NULL,
   'COMUNICADO', 'PUBLICADO', '2026-05-10 11:00:00', 1);

-- ─── 3. Update actividadprograma to future dates ────────────────────────────────
UPDATE actividadprograma SET
  "fechaActividad"        = '2026-05-20',
  "horaInicioActividad"   = '08:00:00',
  "horaFinActividad"      = '09:00:00',
  "estadoActividad"       = 'PROGRAMADA',
  "nombreSalaEspacio"     = 'Auditorio Principal',
  "descripcionActividad"  = 'Acto de bienvenida e inauguración oficial de la Rueda de Negocios del Beni 2026 con presencia de autoridades departamentales y nacionales.'
WHERE id = 1;

UPDATE actividadprograma SET
  "fechaActividad"       = '2026-05-20',
  "horaInicioActividad"  = '14:00:00',
  "horaFinActividad"     = '15:30:00',
  "estadoActividad"      = 'PROGRAMADA'
WHERE id = 2;

UPDATE actividadprograma SET
  "fechaActividad"       = '2026-05-20',
  "horaInicioActividad"  = '16:00:00',
  "horaFinActividad"     = '17:30:00',
  "estadoActividad"      = 'PROGRAMADA'
WHERE id = 3;

UPDATE actividadprograma SET
  "fechaActividad"       = '2026-05-21',
  "horaInicioActividad"  = '09:00:00',
  "horaFinActividad"     = '10:30:00',
  "estadoActividad"      = 'PROGRAMADA'
WHERE id = 4;

-- Insert additional actividades for a fuller schedule
INSERT INTO actividadprograma (
  evento_id, "tipoActividad", "nombreActividad", "descripcionActividad",
  "nombreSalaEspacio", "capacidadPersonasSala",
  "fechaActividad", "horaInicioActividad", "horaFinActividad",
  "nombreCompletoPilaExpositor", "organizacionDelExpositor",
  "estadoActividad", "estaActivo"
) VALUES
  (6, 'CONFERENCIA',
   'Oportunidades de inversión en el sector ganadero del Beni',
   'Conferencia magistral sobre las oportunidades de inversión en el sector ganadero amazónico, con énfasis en sostenibilidad y exportación.',
   'Sala Mamoré', 120,
   '2026-05-21', '11:00:00', '12:30:00',
   'Ing. Carlos Vaca Suárez', 'Federación de Ganaderos del Beni',
   'PROGRAMADA', 1),
  (6, 'TALLER',
   'Digitalización de procesos para PyMEs amazónicas',
   'Taller práctico sobre herramientas digitales para la gestión empresarial, orientado a pequeñas y medianas empresas de la región amazónica boliviana.',
   'Sala de Capacitación', 40,
   '2026-05-21', '14:00:00', '17:00:00',
   'Lic. Ana Moreno Torres', 'Cámara de Industria y Comercio del Beni',
   'PROGRAMADA', 1),
  (6, 'CLAUSURA',
   'Ceremonia de clausura y entrega de resultados',
   'Cierre oficial del evento con presentación de resultados, estadísticas de reuniones concretadas y compromisos comerciales establecidos durante la Rueda de Negocios 2026.',
   'Auditorio Principal', 300,
   '2026-05-22', '17:00:00', '19:00:00',
   NULL, NULL,
   'PROGRAMADA', 1);

-- ─── Verify results ─────────────────────────────────────────────────────────────
SELECT 'REUNIONES FUTURAS' as check_name, COUNT(*) as total
FROM reunion WHERE "fechaHoraInicioReunion" >= NOW();

SELECT 'NOTICIAS PUBLICADAS' as check_name, COUNT(*) as total
FROM noticia WHERE "estadoPublicacion" = 'PUBLICADO' AND "estaActivo" = 1;

SELECT 'ACTIVIDADES FUTURAS' as check_name, COUNT(*) as total
FROM actividadprograma WHERE "fechaActividad" >= CURRENT_DATE AND "estaActivo" = 1;
