import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ActividadesModule } from './contexts/actividades/actividades.module.js';
import { AuthModule } from './contexts/auth/auth.module.js';
import { AsistenciasModule } from './contexts/asistencias/asistencias.module.js';
import { ArchivosModule } from './contexts/archivos/archivos.module.js';
import { AsistenteModule } from './contexts/asistente/asistente.module.js';
import { AuditoriaModule } from './contexts/auditoria/auditoria.module.js';
import { AuspiciadoresModule } from './contexts/auspiciadores/auspiciadores.module.js';
import { CredencialesModule } from './contexts/credenciales/credenciales.module.js';
import { EmpresasModule } from './contexts/empresas/empresas.module.js';
import { EventosModule } from './contexts/eventos/eventos.module.js';
import { HorariosModule } from './contexts/horarios/horarios.module.js';
import { MensajeriaModule } from './contexts/mensajeria/mensajeria.module.js';
import { MesasModule } from './contexts/mesas/mesas.module.js';
import { NoticiasModule } from './contexts/noticias/noticias.module.js';
import { NotificacionesModule } from './contexts/notificaciones/notificaciones.module.js';
import { OportunidadesModule } from './contexts/oportunidades/oportunidades.module.js';
import { PagosModule } from './contexts/pagos/pagos.module.js';
import { PaquetesModule } from './contexts/paquetes/paquetes.module.js';
import { ParticipantesModule } from './contexts/participantes/participantes.module.js';
import { RegistroModule } from './contexts/registro/registro.module.js';
import { ReportesModule } from './contexts/reportes/reportes.module.js';
import { ReunionesModule } from './contexts/reuniones/reuniones.module.js';
import { SolicitudesModule } from './contexts/solicitudes/solicitudes.module.js';
import { UsuariosModule } from './contexts/usuarios/usuarios.module.js';
import { AccessTokenGuard } from './contexts/auth/infrastructure/http/guards/access-token.guard.js';
import { RolesGuard } from './contexts/auth/infrastructure/http/guards/roles.guard.js';
import { EnvModule } from './shared/config/env.module.js';
import { HealthController } from './shared/infrastructure/http/health.controller.js';
import { DomainExceptionFilter } from './shared/infrastructure/http/filters/domain-exception.filter.js';
import { AuditInterceptor } from './shared/infrastructure/http/interceptors/audit.interceptor.js';
import { RateLimitGuard } from './shared/infrastructure/http/guards/rate-limit.guard.js';
import { PrismaModule } from './shared/infrastructure/persistence/prisma.module.js';
import { SharedModule } from './shared/shared.module.js';

@Module({
  imports: [
    EnvModule,
    // Meetings start, warn and close themselves on the event's clock.
    ScheduleModule.forRoot(),
    PrismaModule,
    SharedModule,
    AuthModule,
    EventosModule,
    NotificacionesModule,
    EmpresasModule,
    CredencialesModule,
    ParticipantesModule,
    AsistenciasModule,
    PagosModule,
    RegistroModule,
    ActividadesModule,
    NoticiasModule,
    MesasModule,
    HorariosModule,
    SolicitudesModule,
    ReunionesModule,
    PaquetesModule,
    AuspiciadoresModule,
    UsuariosModule,
    MensajeriaModule,
    ArchivosModule,
    AuditoriaModule,
    OportunidadesModule,
    AsistenteModule,
    ReportesModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: throttle first, then authenticate, then authorise.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    // Declared here rather than in `main.ts`, so every way of starting the
    // application — including the tests — renders domain errors the same way.
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
