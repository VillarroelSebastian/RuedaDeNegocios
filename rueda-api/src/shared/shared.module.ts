import { Global, Module } from '@nestjs/common';
import { ATTEMPT_LIMITER_PORT } from './application/ports/attempt-limiter.port.js';
import { AUDIT_TRAIL_PORT } from './application/ports/audit-trail.port.js';
import { CLOCK_PORT } from './application/ports/clock.port.js';
import { FILE_STORAGE_PORT } from './application/ports/file-storage.port.js';
import { MAILER_PORT } from './application/ports/mailer.port.js';
import { PASSWORD_HASHER_PORT } from './application/ports/password-hasher.port.js';
import { QR_GENERATOR_PORT } from './application/ports/qr-generator.port.js';
import { TEMPORARY_PASSWORD_PORT } from './application/ports/temporary-password.port.js';
import { ENV } from './config/env.module.js';
import type { Env } from './config/env.schema.js';
import { BcryptPasswordHasherAdapter } from './infrastructure/adapters/bcrypt-password-hasher.adapter.js';
import { LocalFileStorageAdapter } from './infrastructure/adapters/local-file-storage.adapter.js';
import { PrismaAttemptLimiterAdapter } from './infrastructure/adapters/prisma-attempt-limiter.adapter.js';
import { PrismaAuditTrailAdapter } from './infrastructure/adapters/prisma-audit-trail.adapter.js';
import { CryptoTemporaryPasswordAdapter } from './infrastructure/adapters/crypto-temporary-password.adapter.js';
import { NodemailerMailerAdapter } from './infrastructure/adapters/nodemailer-mailer.adapter.js';
import { QrcodeGeneratorAdapter } from './infrastructure/adapters/qrcode-generator.adapter.js';
import { SystemClockAdapter } from './infrastructure/adapters/system-clock.adapter.js';

/**
 * Binds every shared driven port to its concrete adapter. Contexts depend on
 * the port symbols only, so swapping an implementation never touches a use case.
 */
@Global()
@Module({
  providers: [
    { provide: CLOCK_PORT, useClass: SystemClockAdapter },
    { provide: PASSWORD_HASHER_PORT, useClass: BcryptPasswordHasherAdapter },
    { provide: QR_GENERATOR_PORT, useClass: QrcodeGeneratorAdapter },
    { provide: FILE_STORAGE_PORT, useClass: LocalFileStorageAdapter },
    { provide: ATTEMPT_LIMITER_PORT, useClass: PrismaAttemptLimiterAdapter },
    { provide: AUDIT_TRAIL_PORT, useClass: PrismaAuditTrailAdapter },
    { provide: TEMPORARY_PASSWORD_PORT, useClass: CryptoTemporaryPasswordAdapter },
    {
      provide: MAILER_PORT,
      useFactory: (env: Env) => new NodemailerMailerAdapter(env),
      inject: [ENV],
    },
  ],
  exports: [
    CLOCK_PORT,
    PASSWORD_HASHER_PORT,
    QR_GENERATOR_PORT,
    FILE_STORAGE_PORT,
    MAILER_PORT,
    ATTEMPT_LIMITER_PORT,
    AUDIT_TRAIL_PORT,
    TEMPORARY_PASSWORD_PORT,
  ],
})
export class SharedModule {}
