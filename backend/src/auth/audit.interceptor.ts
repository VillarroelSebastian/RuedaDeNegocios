import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<any>();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next.handle();
    const started = Date.now();
    return next.handle().pipe(tap({ complete: () => {
      const clean = { ...(req.body || {}) };
      for (const key of ['contrasenia', 'passwordActual', 'passwordNueva', 'nuevaContrasenia', 'codigo', 'token']) delete clean[key];
      const details = JSON.stringify(clean).slice(0, 4000);
      this.prisma.$executeRaw`INSERT INTO auditoria (usuario_id, rol, accion, ruta, metodo, ip, detalles, fecha_creacion)
        VALUES (${req.user?.sub ?? null}, ${req.user?.role ?? 'PUBLICO'}, ${req.method + ' ' + req.path}, ${req.originalUrl}, ${req.method}, ${req.ip}, ${details}, NOW())`
        .catch(() => undefined);
      void started;
    }}));
  }
}
