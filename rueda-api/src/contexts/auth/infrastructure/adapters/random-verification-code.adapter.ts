import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import type { VerificationCodeGeneratorPort } from '../../application/ports/verification-code.port.js';

@Injectable()
export class RandomVerificationCodeAdapter implements VerificationCodeGeneratorPort {
  /** Six digits, drawn from a cryptographic source rather than `Math.random`. */
  generate(): string {
    return String(randomInt(100_000, 1_000_000));
  }
}
