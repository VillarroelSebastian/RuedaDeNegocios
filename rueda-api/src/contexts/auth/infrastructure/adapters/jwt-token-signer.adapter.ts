import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenClaims, TokenSignerPort } from '../../application/ports/token-signer.port.js';

@Injectable()
export class JwtTokenSignerAdapter implements TokenSignerPort {
  constructor(private readonly jwt: JwtService) {}

  sign(claims: AccessTokenClaims): Promise<string> {
    return this.jwt.signAsync(claims);
  }

  verify(token: string): Promise<AccessTokenClaims> {
    return this.jwt.verifyAsync<AccessTokenClaims>(token);
  }
}
