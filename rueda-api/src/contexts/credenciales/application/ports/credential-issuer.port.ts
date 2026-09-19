/**
 * Issues the QR badge of a participant. Owned by the credenciales context;
 * participantes only triggers it when someone new joins an enabled company.
 */
export interface CredentialIssuerPort {
  issueFor(companyUserId: number, fullName: string): Promise<string>;
}

export const CREDENTIAL_ISSUER_PORT = Symbol('CredentialIssuerPort');
