import { Injectable } from '@nestjs/common';
import { randomBytes, randomInt } from 'node:crypto';
import type { TemporaryPasswordPort } from '../../application/ports/temporary-password.port.js';

/** No `I`, `l`, `O` or `0`: these codes get read out over the phone. */
const UNAMBIGUOUS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const CODE_LENGTH = 10;

@Injectable()
export class CryptoTemporaryPasswordAdapter implements TemporaryPasswordPort {
  generate(): string {
    let code = '';
    // `randomInt` rather than `Math.random`: these become account credentials.
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      code += UNAMBIGUOUS.charAt(randomInt(UNAMBIGUOUS.length));
    }
    return code;
  }

  generatePolicyCompliant(): string {
    // The fixed affixes guarantee an upper case letter, a digit and a symbol,
    // so the result always satisfies `Password`.
    return `Rn!${randomBytes(9).toString('base64url')}9aA`;
  }
}
