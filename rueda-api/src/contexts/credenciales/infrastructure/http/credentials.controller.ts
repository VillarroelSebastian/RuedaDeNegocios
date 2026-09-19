import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ROLES } from '../../../../shared/domain/role.js';
import { Public } from '../../../../shared/infrastructure/http/decorators/public.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  GetPrintableCredentialsUseCase,
  type PrintableSheet,
} from '../../application/use-cases/get-printable-credentials.use-case.js';
import { ReadCredentialUseCase } from '../../application/use-cases/read-credential.use-case.js';
import {
  type ReissueSummary,
  ReissueCredentialsUseCase,
} from '../../application/use-cases/reissue-credentials.use-case.js';
import type { CredentialView } from '../../domain/ports/credentials.repository.port.js';

@Controller('credentials')
export class CredentialsController {
  constructor(
    private readonly readCredential: ReadCredentialUseCase,
    private readonly reissue: ReissueCredentialsUseCase,
    private readonly printable: GetPrintableCredentialsUseCase,
  ) {}

  // The literal routes come before `:companyUserId` so it never captures them.

  /** Replaces `GET /admin/credenciales-imprimibles`. */
  @Roles(ROLES.ADMIN)
  @Get('printable')
  printableSheet(@Query('companyUserId') companyUserId?: string): Promise<PrintableSheet> {
    return this.printable.execute(companyUserId ? Number(companyUserId) : undefined);
  }

  /**
   * Re-renders every badge. Idempotent, meant to be run once after a deploy
   * that changes the badge format. Replaces `POST /admin/regenerar-credenciales`.
   */
  @Roles(ROLES.ADMIN)
  @Post('reissue')
  reissueAll(): Promise<ReissueSummary> {
    return this.reissue.execute();
  }

  /**
   * The badge itself. Public because the point of the QR is that anyone who
   * scans it can confirm the person is registered; the signed token is what
   * keeps it from being enumerated. Replaces `GET /public/credencial/:euId`.
   */
  @Public()
  @Get(':companyUserId')
  credential(
    @Param('companyUserId', ParseIntPipe) companyUserId: number,
    @Query('t') token?: string,
  ): Promise<CredentialView> {
    return this.readCredential.read(companyUserId, token);
  }
}
