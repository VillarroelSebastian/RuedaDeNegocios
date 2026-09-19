import { Module } from '@nestjs/common';
import { ActividadesModule } from '../actividades/actividades.module.js';
import { EmpresasModule } from '../empresas/empresas.module.js';
import { EventosModule } from '../eventos/eventos.module.js';
import { HorariosModule } from '../horarios/horarios.module.js';
import { MesasModule } from '../mesas/mesas.module.js';
import { NoticiasModule } from '../noticias/noticias.module.js';
import { PagosModule } from '../pagos/pagos.module.js';
import { ReunionesModule } from '../reuniones/reuniones.module.js';
import { SolicitudesModule } from '../solicitudes/solicitudes.module.js';
import { BookingConversation } from './application/services/booking-conversation.js';
import { AnswerAssistantUseCase } from './application/use-cases/answer-assistant.use-case.js';
import { AssistantController } from './infrastructure/http/assistant.controller.js';

/**
 * The assistant owns no table. It declares what it needs to talk about — the
 * event, the companies, the meetings, the programme, the announcements, the
 * registration, the requests, the agenda and the tables — and every context
 * that owns one of those answers for itself.
 */
@Module({
  imports: [
    EventosModule,
    EmpresasModule,
    ReunionesModule,
    ActividadesModule,
    NoticiasModule,
    PagosModule,
    SolicitudesModule,
    HorariosModule,
    MesasModule,
  ],
  controllers: [AssistantController],
  providers: [AnswerAssistantUseCase, BookingConversation],
})
export class AsistenteModule {}
