import { Body, Controller, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/authenticated-user.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Public } from '../../../../shared/infrastructure/http/decorators/public.decorator.js';
import { RateLimit } from '../../../../shared/infrastructure/http/decorators/rate-limit.decorator.js';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case.js';
import { ConfirmPasswordResetUseCase } from '../../application/use-cases/confirm-password-reset.use-case.js';
import { LogInUseCase, type LogInResult } from '../../application/use-cases/log-in.use-case.js';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case.js';
import {
  ChangePasswordDto,
  ConfirmPasswordResetDto,
  CreateSessionDto,
  RequestPasswordResetDto,
} from './dto/auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly logIn: LogInUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly confirmPasswordReset: ConfirmPasswordResetUseCase,
  ) {}

  /** Opens a session. Replaces `POST /auth/login`. */
  @Public()
  @RateLimit()
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  createSession(@Body() dto: CreateSessionDto): Promise<LogInResult> {
    return this.logIn.execute({ email: dto.email, password: dto.password });
  }

  /**
   * Changes the caller's own password. Replaces `PUT /auth/cambiar-password`,
   * which took the account id from the request body.
   */
  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateOwnPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.changePassword.execute({
      userId: user.id,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }

  /**
   * Requests a reset code. Always answers 202, whether or not the account
   * exists, so the endpoint cannot be used to enumerate emails.
   */
  @Public()
  @RateLimit()
  @Post('password-reset-requests')
  @HttpCode(HttpStatus.ACCEPTED)
  createPasswordResetRequest(@Body() dto: RequestPasswordResetDto): Promise<void> {
    return this.requestPasswordReset.execute({ email: dto.email });
  }

  /** Redeems a reset code. Replaces `POST /auth/confirmar-reset`. */
  @Public()
  @RateLimit()
  @Post('password-resets')
  @HttpCode(HttpStatus.NO_CONTENT)
  createPasswordReset(@Body() dto: ConfirmPasswordResetDto): Promise<void> {
    return this.confirmPasswordReset.execute({
      email: dto.email,
      code: dto.code,
      newPassword: dto.newPassword,
    });
  }
}
