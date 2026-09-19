import { type MatchableCompany, evaluatePair, keywordsOf } from './opportunity-matching.js';

/** One side of a suggested meeting, as the staff list shows it. */
export interface PairingSide {
  empresaeventoId: number;
  nombre: string;
  codigo: string | null;
  rubro: string | null;
}

export interface Pairing {
  empresaA: PairingSide;
  empresaB: PairingSide;
  motivos: string[];
}

interface ScoredPairing extends Pairing {
  clave: string;
  puntaje: number;
}

interface PreparedCompany {
  index: number;
  company: MatchableCompany;
  oferta: string[];
  demanda: string[];
  intereses: string[];
  rubro: string[];
  rubroExacto: string;
}

/** How many candidates a single index may contribute before it stops looking. */
const CANDIDATES_PER_INDEX = 8;
/** Companies of the very same sector are plenty; the rest adds noise. */
const SAME_SECTOR_CANDIDATES = 9;
/** Options kept per company, so one popular company cannot fill the list. */
const OPTIONS_PER_COMPANY = 3;
const MIN_SUGGESTIONS = 12;
const MAX_SUGGESTIONS = 200;

type WordIndex = Map<string, number[]>;

function indexBy(prepared: PreparedCompany[], words: (item: PreparedCompany) => string[]): WordIndex {
  const index: WordIndex = new Map();

  for (const item of prepared) {
    for (const word of words(item)) {
      const found = index.get(word) ?? [];
      found.push(item.index);
      index.set(word, found);
    }
  }

  return index;
}

function addCandidates(
  into: Set<number>,
  index: WordIndex,
  words: string[],
  self: number,
  limit = CANDIDATES_PER_INDEX,
): void {
  let added = 0;

  for (const word of words) {
    for (const candidate of index.get(word) ?? []) {
      if (candidate === self || into.has(candidate)) continue;

      into.add(candidate);
      added += 1;
      if (added >= limit) return;
    }
  }
}

function sideOf(company: MatchableCompany): PairingSide {
  return {
    empresaeventoId: company.empresaeventoId,
    nombre: company.nombre,
    codigo: company.codigo,
    rubro: company.rubro,
  };
}

/** Score first; names break the tie, so two reads return the same order. */
function byRelevance(left: ScoredPairing, right: ScoredPairing): number {
  return (
    right.puntaje - left.puntaje ||
    left.empresaA.nombre.localeCompare(right.empresaA.nombre, 'es') ||
    left.empresaB.nombre.localeCompare(right.empresaB.nombre, 'es')
  );
}

function pairOf(left: PreparedCompany, right: PreparedCompany): ScoredPairing {
  // The lower enrollment always leads, so a pair reads the same way whichever
  // side proposed it — and so both sides collapse onto a single key.
  const [first, second] =
    left.company.empresaeventoId < right.company.empresaeventoId ? [left, right] : [right, left];
  const evaluation = evaluatePair(first.company, second.company);

  return {
    clave: `${first.company.empresaeventoId}-${second.company.empresaeventoId}`,
    puntaje: evaluation.puntaje,
    empresaA: sideOf(first.company),
    empresaB: sideOf(second.company),
    motivos: evaluation.motivos,
  };
}

/**
 * Which meetings the staff should suggest across the whole event.
 *
 * Every pair is not worth scoring: with 200 companies there are 19.900 of them.
 * The word indexes only produce candidates that already share something, and the
 * selection then runs in rounds — one suggestion for each company first, second
 * and third options only afterwards — so a handful of well-connected companies
 * cannot take over the list.
 */
export function rankPairings(companies: MatchableCompany[]): Pairing[] {
  if (companies.length < 2) return [];

  const prepared: PreparedCompany[] = companies.map((company, index) => ({
    index,
    company,
    oferta: keywordsOf(company.oferta),
    demanda: keywordsOf(company.demanda),
    intereses: keywordsOf(company.interesesBusqueda),
    rubro: keywordsOf(company.rubro),
    rubroExacto: (company.rubro ?? '').trim().toLocaleLowerCase('es'),
  }));

  const offers = indexBy(prepared, (item) => item.oferta);
  const needs = indexBy(prepared, (item) => item.demanda);
  const interests = indexBy(prepared, (item) => item.intereses);
  const sectors = indexBy(prepared, (item) => item.rubro);

  const sameSector = new Map<string, number[]>();
  for (const item of prepared) {
    if (!item.rubroExacto) continue;

    const found = sameSector.get(item.rubroExacto) ?? [];
    found.push(item.index);
    sameSector.set(item.rubroExacto, found);
  }

  const rankings = prepared.map((item) => {
    const candidates = new Set<number>();
    addCandidates(candidates, needs, item.oferta, item.index);
    addCandidates(candidates, offers, item.demanda, item.index);
    addCandidates(candidates, sectors, item.intereses, item.index);
    addCandidates(candidates, interests, item.rubro, item.index);
    for (const candidate of (sameSector.get(item.rubroExacto) ?? []).slice(
      0,
      SAME_SECTOR_CANDIDATES,
    )) {
      if (candidate !== item.index) candidates.add(candidate);
    }

    return [...candidates]
      .map((candidate) => pairOf(item, prepared[candidate]!))
      .filter((pairing) => pairing.motivos.length > 0)
      .sort(byRelevance)
      .slice(0, OPTIONS_PER_COMPANY);
  });

  const cap = Math.min(MAX_SUGGESTIONS, Math.max(MIN_SUGGESTIONS, companies.length));
  const chosen = new Map<string, ScoredPairing>();
  for (let option = 0; option < OPTIONS_PER_COMPANY && chosen.size < cap; option += 1) {
    for (const ranking of rankings) {
      const pairing = ranking[option];
      if (pairing) chosen.set(pairing.clave, pairing);
      if (chosen.size >= cap) break;
    }
  }

  return [...chosen.values()]
    .sort(byRelevance)
    .map(({ clave: _clave, puntaje: _puntaje, ...pairing }) => pairing);
}
