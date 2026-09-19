/**
 * Contact details are compared across records that were typed by different
 * people, so they are normalised before any duplicate check.
 */

/** Only scalars carry contact data; anything else normalises to nothing. */
function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return '';
}

/** Digits only: `+591 700-00000` and `59170000000` are the same number. */
export function normalizePhone(value: unknown): string {
  return asText(value).replace(/\D/g, '');
}

export function normalizeEmail(value: unknown): string {
  return asText(value).trim().toLowerCase();
}

/** True when two phone numbers refer to the same line. Empty never matches. */
export function sameContact(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizePhone(left);
  return normalizedLeft.length > 0 && normalizedLeft === normalizePhone(right);
}
