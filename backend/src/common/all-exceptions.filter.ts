import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

// Sin este filtro, cualquier error que no lancemos nosotros a propósito
// (un bug, un fallo de base de datos, lo que sea) cae en el manejo por
// defecto de NestJS, que responde con "Internal Server Error" en inglés
// — eso es lo que el usuario final terminaba viendo en pantalla. Las
// excepciones que sí lanzamos nosotros (BadRequestException('mensaje en
// español'), etc.) ya traen su mensaje correcto y se reenvían tal cual.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    // Los gateways de sockets (notificaciones) no tienen un response HTTP
    // que responder; solo se deja registro del error.
    if (host.getType() !== 'http') {
      this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : exception);
      return;
    }

    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res.status(status).json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocurrió un error inesperado. Intenta de nuevo en unos minutos.',
    });
  }
}
