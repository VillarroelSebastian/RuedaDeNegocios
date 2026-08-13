/**
 * Sectores productivos de la Rueda de Negocios del Beni.
 *
 * Fuente única para el registro, el perfil de empresa y los sectores de
 * interés. Antes la lista estaba copiada en varios archivos y se desincronizaba.
 * El backend mantiene su propio mapa de afinidad con estos mismos nombres, así
 * que si cambia un nombre aquí hay que cambiarlo también en
 * `RUBROS_COMPLEMENTARIOS` de app.controller.ts.
 */
export const RUBROS = [
  "Agricultura y Producción de Granos",
  "Ganadería y Producción Pecuaria",
  "Agroindustria",
  "Bioeconomía Amazónica",
  "Forestal y Maderero",
  "Piscicultura",
  "Turismo",
  "Industria y Manufactura",
  "Logística, Transporte y Comercio Exterior",
  "Energía y Tecnología",
  "Servicios Empresariales",
  "Servicios Financieros e Inversión",
] as const;

/**
 * Valor centinela de los selectores que admiten escribir a mano (rubro, país,
 * ciudad). No es un sector de interés válido ni se guarda tal cual: cuando se
 * elige, el formulario pide el texto real en un campo aparte.
 */
export const OTRO = "Otro";

export const RUBROS_CON_OTRO: string[] = [...RUBROS, OTRO];
