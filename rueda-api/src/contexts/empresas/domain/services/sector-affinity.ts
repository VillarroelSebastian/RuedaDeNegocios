/**
 * Which sectors do business with which. Drives the ordering of the participant
 * directory, so a company sees the counterparts worth meeting first.
 */
export const COMPLEMENTARY_SECTORS: Record<string, string[]> = {
  'Agricultura y Producción de Granos': [
    'Agroindustria',
    'Logística, Transporte y Comercio Exterior',
    'Energía y Tecnología',
    'Servicios Financieros e Inversión',
    'Industria y Manufactura',
  ],
  'Ganadería y Producción Pecuaria': [
    'Agroindustria',
    'Logística, Transporte y Comercio Exterior',
    'Servicios Financieros e Inversión',
    'Energía y Tecnología',
    'Industria y Manufactura',
  ],
  Agroindustria: [
    'Agricultura y Producción de Granos',
    'Ganadería y Producción Pecuaria',
    'Piscicultura',
    'Industria y Manufactura',
    'Logística, Transporte y Comercio Exterior',
    'Servicios Financieros e Inversión',
  ],
  'Bioeconomía Amazónica': [
    'Forestal y Maderero',
    'Turismo',
    'Agroindustria',
    'Energía y Tecnología',
    'Servicios Empresariales',
  ],
  'Forestal y Maderero': [
    'Bioeconomía Amazónica',
    'Industria y Manufactura',
    'Logística, Transporte y Comercio Exterior',
    'Servicios Financieros e Inversión',
  ],
  Piscicultura: [
    'Agroindustria',
    'Logística, Transporte y Comercio Exterior',
    'Bioeconomía Amazónica',
    'Servicios Financieros e Inversión',
  ],
  Turismo: [
    'Bioeconomía Amazónica',
    'Servicios Empresariales',
    'Logística, Transporte y Comercio Exterior',
    'Energía y Tecnología',
  ],
  'Industria y Manufactura': [
    'Agroindustria',
    'Forestal y Maderero',
    'Logística, Transporte y Comercio Exterior',
    'Energía y Tecnología',
    'Servicios Financieros e Inversión',
  ],
  'Logística, Transporte y Comercio Exterior': [
    'Agricultura y Producción de Granos',
    'Ganadería y Producción Pecuaria',
    'Agroindustria',
    'Forestal y Maderero',
    'Piscicultura',
    'Industria y Manufactura',
  ],
  'Energía y Tecnología': [
    'Industria y Manufactura',
    'Agricultura y Producción de Granos',
    'Bioeconomía Amazónica',
    'Servicios Empresariales',
    'Turismo',
  ],
  'Servicios Empresariales': [
    'Servicios Financieros e Inversión',
    'Turismo',
    'Energía y Tecnología',
    'Industria y Manufactura',
  ],
  'Servicios Financieros e Inversión': [
    'Servicios Empresariales',
    'Agricultura y Producción de Granos',
    'Ganadería y Producción Pecuaria',
    'Agroindustria',
    'Industria y Manufactura',
    'Logística, Transporte y Comercio Exterior',
  ],
};

export type Affinity = 'alta' | 'media' | null;

/** Same sector is a direct match; a complementary one is a partial match. */
export function affinityBetween(mine: string | null, theirs: string | null): Affinity {
  if (!mine || !theirs) return null;
  if (mine === theirs) return 'alta';

  // The table is authored one way round but the relationship is symmetric.
  const declared =
    COMPLEMENTARY_SECTORS[mine]?.includes(theirs) || COMPLEMENTARY_SECTORS[theirs]?.includes(mine);
  return declared ? 'media' : null;
}

const AFFINITY_WEIGHT: Record<string, number> = { alta: 2, media: 1 };

export interface DirectoryOrderable {
  nombre: string | null;
  afinidad: Affinity;
  destacado: boolean;
}

/**
 * Affinity leads. A paid highlight only breaks a tie between companies that are
 * equally relevant, so buying visibility never outranks a better match.
 */
export function compareByAffinity(left: DirectoryOrderable, right: DirectoryOrderable): number {
  const leftWeight = left.afinidad ? AFFINITY_WEIGHT[left.afinidad] : 0;
  const rightWeight = right.afinidad ? AFFINITY_WEIGHT[right.afinidad] : 0;
  if (leftWeight !== rightWeight) return rightWeight - leftWeight;

  if (left.destacado !== right.destacado) return left.destacado ? -1 : 1;
  return (left.nombre ?? '').localeCompare(right.nombre ?? '', 'es');
}
