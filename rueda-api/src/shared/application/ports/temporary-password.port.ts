/** Mints throwaway passwords handed to a person for their first login. */
export interface TemporaryPasswordPort {
  /** Readable code for a brand new participant account. */
  generate(): string;
  /** Meets the account password policy, for an administrator-issued reset. */
  generatePolicyCompliant(): string;
}

export const TEMPORARY_PASSWORD_PORT = Symbol('TemporaryPasswordPort');
