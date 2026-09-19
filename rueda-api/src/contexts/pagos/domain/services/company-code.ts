/**
 * Readable company code, handed out when a registration is approved. It is what
 * staff reads aloud at the door, so it favours legibility over compactness.
 */

/** Corporate noise that carries no identity. */
const STOP_WORDS = new Set([
  'SRL',
  'SA',
  'LTDA',
  'SOCIEDAD',
  'EMPRESA',
  'COMPANIA',
  'CIA',
  'DE',
  'DEL',
  'LA',
  'EL',
  'Y',
]);

const MAX_INITIALS = 4;
const MIN_INITIALS = 3;
const FALLBACK = 'EMP';

/** Initials of the meaningful words, e.g. `Agro Beni SRL` becomes `AB`. */
export function companyCodePrefix(name: string): string {
  const words = (name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const meaningful = words.filter((word) => !STOP_WORDS.has(word.toUpperCase()));
  // A name made entirely of stop words still needs a code.
  const source = meaningful.length > 0 ? meaningful : words;

  const initials = source
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, MAX_INITIALS);

  if (initials.length >= MIN_INITIALS) return initials || FALLBACK;

  // One or two initials read as nothing, so the first word is used instead.
  return (
    (source[0] ?? FALLBACK)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .padEnd(MIN_INITIALS, 'X')
      .slice(0, MIN_INITIALS) || FALLBACK
  );
}

/**
 * The id already guarantees uniqueness; `attempt` only exists for the unlikely
 * case where two companies land on the same padded code.
 */
export function companyCodeFor(name: string, companyId: number, attempt = 0): string {
  const base = `RB-${companyCodePrefix(name)}-${String(companyId).padStart(4, '0')}`;
  return attempt === 0 ? base : `${base}-${attempt}`;
}
