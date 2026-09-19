import { isValidSignedLink, signLink } from '../../../../shared/domain/signed-link.js';

/** What the tracking link is signed over. */
const subjectOf = (companyEventId: number) => `seguimiento-${companyEventId}`;

/**
 * Signs the enrollment tracking link. A company follows its registration — and
 * uploads a corrected receipt — through this link, without an account.
 */
export function trackingTokenFor(companyEventId: number, secret: string): string {
  return signLink(subjectOf(companyEventId), secret);
}

export function isValidTrackingToken(
  companyEventId: number,
  candidate: string | undefined,
  secret: string,
): boolean {
  return isValidSignedLink(subjectOf(companyEventId), candidate, secret);
}
