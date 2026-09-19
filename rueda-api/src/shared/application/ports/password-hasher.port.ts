/** Hashes and verifies user passwords. Implemented with bcrypt. */
export interface PasswordHasherPort {
  hash(plain: string): Promise<string>;
  verify(plain: string, hashed: string): Promise<boolean>;
}

export const PASSWORD_HASHER_PORT = Symbol('PasswordHasherPort');
