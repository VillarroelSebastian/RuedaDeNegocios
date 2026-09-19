import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, type DomainErrorCode } from '../../../domain/errors/domain.error.js';

const STATUS_BY_CODE: Record<DomainErrorCode, HttpStatus> = {
  VALIDATION: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
};

export function toHttpStatus(error: DomainError): HttpStatus {
  return STATUS_BY_CODE[error.code];
}

/** Translates domain failures into the HTTP shape the clients already consume. */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const status = toHttpStatus(error);
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      message: error.message,
      error: error.code,
    });
  }
}
