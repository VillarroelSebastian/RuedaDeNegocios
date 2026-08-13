/**
 * Sectores productivos de la Rueda de Negocios del Beni.
 *
 * Debe coincidir con web/src/lib/rubros.ts y con el mapa `RUBROS_COMPLEMENTARIOS`
 * de backend/src/app.controller.ts: la afinidad entre empresas se calcula
 * comparando estos nombres exactos.
 */
export const RUBROS = [
  'Agricultura y Producción de Granos',
  'Ganadería y Producción Pecuaria',
  'Agroindustria',
  'Bioeconomía Amazónica',
  'Forestal y Maderero',
  'Piscicultura',
  'Turismo',
  'Industria y Manufactura',
  'Logística, Transporte y Comercio Exterior',
  'Energía y Tecnología',
  'Servicios Empresariales',
  'Servicios Financieros e Inversión',
];

/**
 * Valor centinela de los selectores que admiten escribir a mano (rubro, país,
 * ciudad). No se guarda tal cual: al elegirlo se pide el texto real aparte.
 */
export const OTRO = 'Otro';

export const RUBROS_CON_OTRO: string[] = [...RUBROS, OTRO];
