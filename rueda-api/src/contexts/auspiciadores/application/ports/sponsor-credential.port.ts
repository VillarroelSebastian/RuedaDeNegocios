/** Renders and stores the QR badge of one person of a sponsor. */
export interface SponsorCredentialIssuerPort {
  issueFor(personId: number): Promise<string>;
}

export const SPONSOR_CREDENTIAL_ISSUER_PORT = Symbol('SponsorCredentialIssuerPort');

export interface SponsorCredentialEmail {
  correo: string;
  nombreCompleto: string;
  nombreEmpresa: string;
  eventoNombre: string;
  urlCredencialQR: string;
}

export interface PlatformAccessEmail {
  correo: string;
  nombreEmpresa: string;
  contraseniaTemporal: string;
}

export interface SponsorNotifierPort {
  /** Sends one person their badge. Reports failure: the address may be wrong. */
  sendCredential(email: SponsorCredentialEmail): Promise<void>;
  /** Sends the sponsor the account it can enter the platform with. */
  sendPlatformAccess(email: PlatformAccessEmail): Promise<void>;
}

export const SPONSOR_NOTIFIER_PORT = Symbol('SponsorNotifierPort');
