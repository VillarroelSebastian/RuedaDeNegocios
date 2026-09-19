/** Generates the one-time code emailed during a password reset. */
export interface VerificationCodeGeneratorPort {
  generate(): string;
}

export const VERIFICATION_CODE_GENERATOR = Symbol('VerificationCodeGeneratorPort');
