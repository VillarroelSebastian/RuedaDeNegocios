import type { CredentialView } from '../../domain/ports/credentials.repository.port.js';

/**
 * Reads a badge after checking its signature. Exposed so other contexts —
 * attendance, in particular — can resolve a scanned QR without reaching into
 * the credentials repository themselves.
 */
export interface CredentialReaderPort {
  /** Throws when the signature is wrong or the badge does not exist. */
  read(companyUserId: number, token: string | undefined): Promise<CredentialView>;
}

export const CREDENTIAL_READER_PORT = Symbol('CredentialReaderPort');
