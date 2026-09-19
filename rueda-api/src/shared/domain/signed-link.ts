import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signs a link that anyone holding it may open: a badge, a sponsor credential,
 * a registration being followed. The subject carries what the link is for as
 * well as which one it is, so a token minted for one kind cannot open another.
 */
export function signLink(subject: string, secret: string): string {
  return createHmac('sha256', secret).update(subject).digest('hex');
}

export function isValidSignedLink(
  subject: string,
  candidate: string | undefined,
  secret: string,
): boolean {
  if (!candidate) return false;

  const expected = signLink(subject, secret);
  // Length is checked first: `timingSafeEqual` throws on mismatched buffers.
  if (candidate.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}
