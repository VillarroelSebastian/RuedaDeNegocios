import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ENV } from '../../shared/config/env.module.js';
import type { Env } from '../../shared/config/env.schema.js';
import { PASSWORD_RESET_NOTIFIER } from './application/ports/password-reset-notifier.port.js';
import { TOKEN_SIGNER_PORT } from './application/ports/token-signer.port.js';
import { VERIFICATION_CODE_GENERATOR } from './application/ports/verification-code.port.js';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case.js';
import { ConfirmPasswordResetUseCase } from './application/use-cases/confirm-password-reset.use-case.js';
import { LogInUseCase } from './application/use-cases/log-in.use-case.js';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case.js';
import { COMPANY_MEMBERSHIP_REPOSITORY } from './domain/ports/company-membership.repository.port.js';
import { SESSION_REPOSITORY } from './domain/ports/session.repository.port.js';
import { USER_ACCOUNT_REPOSITORY } from './domain/ports/user-account.repository.port.js';
import { EmailPasswordResetNotifierAdapter } from './infrastructure/adapters/email-password-reset-notifier.adapter.js';
import { JwtTokenSignerAdapter } from './infrastructure/adapters/jwt-token-signer.adapter.js';
import { RandomVerificationCodeAdapter } from './infrastructure/adapters/random-verification-code.adapter.js';
import { AuthController } from './infrastructure/http/auth.controller.js';
import { PrismaCompanyMembershipRepository } from './infrastructure/persistence/prisma-company-membership.repository.js';
import { PrismaSessionRepository } from './infrastructure/persistence/prisma-session.repository.js';
import { PrismaUserAccountRepository } from './infrastructure/persistence/prisma-user-account.repository.js';

const TOKEN_LIFETIME = '8h';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_SECRET,
        signOptions: { expiresIn: TOKEN_LIFETIME },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    LogInUseCase,
    ChangePasswordUseCase,
    RequestPasswordResetUseCase,
    ConfirmPasswordResetUseCase,
    { provide: USER_ACCOUNT_REPOSITORY, useClass: PrismaUserAccountRepository },
    { provide: COMPANY_MEMBERSHIP_REPOSITORY, useClass: PrismaCompanyMembershipRepository },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: TOKEN_SIGNER_PORT, useClass: JwtTokenSignerAdapter },
    { provide: VERIFICATION_CODE_GENERATOR, useClass: RandomVerificationCodeAdapter },
    { provide: PASSWORD_RESET_NOTIFIER, useClass: EmailPasswordResetNotifierAdapter },
  ],
  // The global guards live in AppModule and resolve these two from here.
  exports: [TOKEN_SIGNER_PORT, SESSION_REPOSITORY],
})
export class AuthModule {}
