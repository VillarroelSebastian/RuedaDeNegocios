import { affinityBetween } from '../../../empresas/domain/services/sector-affinity.js';

/** A company as the matcher reads it: what it offers, needs and looks for. */
export interface MatchableCompany {
  empresaeventoId: number;
  empresaId: number;
  codigo: string | null;
  nombre: string;
  rubro: string | null;
  oferta: string | null;
  demanda: string | null;
  interesesBusqueda: string | null;
  urlFotoPerfil: string | null;
  ciudad: string | null;
  pais: string | null;
}

/** Shorter words — "de", "los", "y" — appear everywhere and mean nothing here. */
const MIN_KEYWORD_LENGTH = 4;

/** Lower case, no accents, no duplicates: the form two texts are compared in. */
export function keywordsOf(text: string | null | undefined): string[] {
  if (!text) return [];

  return [
    ...new Set(
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= MIN_KEYWORD_LENGTH),
    ),
  ];
}

/** Whether two texts have at least one meaningful word in common. */
export function shareKeywords(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return false;

  const known = new Set(keywordsOf(left));
  return keywordsOf(right).some((word) => known.has(word));
}

/**
 * Why one company should meet another, written from the reader's side. The
 * shared sector is the weakest reason, so it is only offered when nothing
 * concrete matched.
 */
export function reasonsToMeet(mine: MatchableCompany, theirs: MatchableCompany): string[] {
  const reasons: string[] = [];

  if (theirs.interesesBusqueda && shareKeywords(theirs.interesesBusqueda, mine.rubro)) {
    reasons.push(`Busca empresas del rubro "${mine.rubro}"`);
  }
  if (mine.interesesBusqueda && shareKeywords(mine.interesesBusqueda, theirs.rubro)) {
    reasons.push('Coincide con tu interés declarado');
  }
  if (shareKeywords(theirs.oferta, mine.demanda)) {
    reasons.push('Su oferta coincide con lo que buscas');
  }
  if (shareKeywords(theirs.demanda, mine.oferta)) {
    reasons.push('Busca lo que tu empresa ofrece');
  }
  if (reasons.length === 0 && affinityBetween(mine.rubro, theirs.rubro) === 'alta') {
    reasons.push('Mismo rubro que tu empresa');
  }

  return reasons;
}

export interface PairEvaluation {
  motivos: string[];
  puntaje: number;
}

const SUPPLY_MATCH_SCORE = 4;
const INTEREST_MATCH_SCORE = 2;
const SAME_SECTOR_SCORE = 1;

/**
 * Why two companies are worth putting in front of each other, written for the
 * staff who reads both sides. One side supplying what the other needs is the
 * strongest signal; sharing a sector alone is the weakest.
 */
export function evaluatePair(left: MatchableCompany, right: MatchableCompany): PairEvaluation {
  const motivos: string[] = [];
  let puntaje = 0;

  if (shareKeywords(left.oferta, right.demanda)) {
    motivos.push(`${left.nombre} ofrece lo que busca ${right.nombre}`);
    puntaje += SUPPLY_MATCH_SCORE;
  }
  if (shareKeywords(right.oferta, left.demanda)) {
    motivos.push(`${right.nombre} ofrece lo que busca ${left.nombre}`);
    puntaje += SUPPLY_MATCH_SCORE;
  }
  if (
    shareKeywords(left.interesesBusqueda, right.rubro) ||
    shareKeywords(right.interesesBusqueda, left.rubro)
  ) {
    motivos.push('Coincidencia de rubro e intereses');
    puntaje += INTEREST_MATCH_SCORE;
  }
  if (motivos.length === 0 && affinityBetween(left.rubro, right.rubro) === 'alta') {
    motivos.push('Empresas del mismo rubro');
    puntaje = SAME_SECTOR_SCORE;
  }

  return { motivos, puntaje };
}
