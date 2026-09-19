import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  COMPANY_NOTIFIER_PORT,
  type CompanyNotifierPort,
} from '../../../../shared/application/ports/company-notifier.port.js';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../../shared/application/ports/password-hasher.port.js';
import {
  TEMPORARY_PASSWORD_PORT,
  type TemporaryPasswordPort,
} from '../../../../shared/application/ports/temporary-password.port.js';
import {
  CREDENTIAL_ISSUER_PORT,
  type CredentialIssuerPort,
} from '../../../credenciales/application/ports/credential-issuer.port.js';
import {
  PAYMENTS_REPOSITORY,
  type MemberToCredential,
  type PaymentsRepositoryPort,
} from '../../domain/ports/payments.repository.port.js';
import {
  PAYMENT_NOTIFIER_PORT,
  type PaymentNotifierPort,
} from '../ports/payment-notifier.port.js';

export interface ApprovalResult {
  companyEventId: number;
  /** Addresses the credentials could not be delivered to. */
  correosFallidos: string[];
  credencialesEnviadas: boolean;
}

/**
 * Approving a registration payment is what actually admits a company: it
 * enables access, mints credentials for every member and emails them out.
 */
@Injectable()
export class ApproveEnrollmentPaymentUseCase {
  private readonly logger = new Logger(ApproveEnrollmentPaymentUseCase.name);

  constructor(
    @Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TEMPORARY_PASSWORD_PORT) private readonly passwords: TemporaryPasswordPort,
    @Inject(CREDENTIAL_ISSUER_PORT) private readonly credentials: CredentialIssuerPort,
    @Inject(PAYMENT_NOTIFIER_PORT) private readonly notifier: PaymentNotifierPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {}

  async execute(companyEventId: number): Promise<ApprovalResult> {
    const approved = await this.payments.approveEnrollment(companyEventId);
    const companyCode = await this.payments.ensureCompanyCode(
      approved.companyId,
      approved.companyCode,
    );

    const correosFallidos: string[] = [];
    for (const member of approved.members) {
      const delivered = await this.credentialMember(member, approved.eventName, approved.companyName, companyCode);
      if (!delivered) correosFallidos.push(member.correo);
    }

    await this.companies.notify({
      companyEventId: approved.companyEventId,
      tipo: 'pago:aprobado',
      titulo: 'Pago aprobado',
      mensaje: 'Tu pago de inscripción fue aprobado. ¡Ya tienes acceso al evento!',
    });

    return {
      companyEventId: approved.companyEventId,
      correosFallidos,
      credencialesEnviadas: correosFallidos.length === 0,
    };
  }

  private async credentialMember(
    member: MemberToCredential,
    eventName: string | null,
    companyName: string,
    companyCode: string,
  ): Promise<boolean> {
    // Someone already taking part with another company keeps their password.
    const temporaryPassword = member.reusedAccount ? null : this.passwords.generate();

    let qrUrl: string | null = null;
    try {
      qrUrl = await this.credentials.issueFor(
        member.companyUserId,
        `${member.nombres} ${member.apellidoPaterno}`,
      );
    } catch (error) {
      this.logger.warn(
        `Could not issue the badge of membership ${member.companyUserId}: ${String(error)}`,
      );
    }

    const delivered = await this.notifier.sendApproval({
      member,
      companyName,
      eventName,
      companyCode,
      temporaryPassword,
      qrUrl,
    });

    // The new password is written only after the email carrying it went out.
    // Rotating a password that was never delivered would lock the person out.
    if (delivered && temporaryPassword) {
      await this.payments.setPassword(member.userId, await this.hasher.hash(temporaryPassword));
    }

    return delivered;
  }
}
