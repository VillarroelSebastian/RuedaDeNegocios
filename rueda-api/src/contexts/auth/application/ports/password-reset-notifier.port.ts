/**
 * Delivers the one-time reset code. Keeping it behind a port keeps the email
 * markup out of the application layer.
 */
export interface PasswordResetNotifierPort {
  sendResetCode(recipient: { email: string; nombres: string }, code: string): Promise<void>;
}

export const PASSWORD_RESET_NOTIFIER = Symbol('PasswordResetNotifierPort');
