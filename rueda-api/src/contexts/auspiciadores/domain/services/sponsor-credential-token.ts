import { isValidSignedLink, signLink } from '../../../../shared/domain/signed-link.js';

/** What the sponsor credential link is signed over. */
const subjectOf = (personId: number) => `auspiciador-${personId}`;

/**
 * Signs the credential of one person of a sponsor. Without it the badge could
 * be opened for anybody by guessing an id, and the subject keeps it apart from
 * a participant's badge with the same number.
 */
export function sponsorCredentialTokenFor(personId: number, secret: string): string {
  return signLink(subjectOf(personId), secret);
}

export function isValidSponsorCredentialToken(
  personId: number,
  candidate: string | undefined,
  secret: string,
): boolean {
  return isValidSignedLink(subjectOf(personId), candidate, secret);
}
