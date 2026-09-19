import { isValidSignedLink, signLink } from '../../../../shared/domain/signed-link.js';

/** What the badge link is signed over. */
const subjectOf = (companyUserId: number) => `credencial-${companyUserId}`;

/**
 * Signs the public credential link. Without it the badge page could be opened
 * for any participant by guessing a membership id.
 */
export function credentialTokenFor(companyUserId: number, secret: string): string {
  return signLink(subjectOf(companyUserId), secret);
}

export function isValidCredentialToken(
  companyUserId: number,
  candidate: string | undefined,
  secret: string,
): boolean {
  return isValidSignedLink(subjectOf(companyUserId), candidate, secret);
}
