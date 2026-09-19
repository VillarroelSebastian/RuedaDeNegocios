import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { PasswordHasherPort } from '../../application/ports/password-hasher.port.js';

/** Matches the cost factor already used by every hash stored in production. */
const SALT_ROUNDS = 10;

@Injectable()
export class BcryptPasswordHasherAdapter implements PasswordHasherPort {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  verify(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
