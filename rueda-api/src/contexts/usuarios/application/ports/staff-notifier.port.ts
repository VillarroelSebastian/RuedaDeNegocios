export interface TechnicianCredentialsEmail {
  correo: string;
  nombres: string;
  apellidoPaterno: string;
  contraseniaTemporal: string;
  eventoNombre: string | null;
  eventoEdicion: string | null;
}

export interface ProfileResetEmail {
  correo: string;
  contraseniaTemporal: string;
}

/**
 * Sends staff accounts the password they log in with. Failures are reported,
 * not swallowed: a technician who never receives the email has no way in.
 */
export interface StaffCredentialsNotifierPort {
  sendTechnicianCredentials(email: TechnicianCredentialsEmail): Promise<void>;
  /** Sent to the new address when somebody changes the one on their profile. */
  sendProfileReset(email: ProfileResetEmail): Promise<void>;
}

export const STAFF_CREDENTIALS_NOTIFIER = Symbol('StaffCredentialsNotifierPort');
