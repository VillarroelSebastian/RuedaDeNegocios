import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  EVENT_REPOSITORY,
  type EventRecord,
  type EventRepositoryPort,
} from '../../domain/ports/event.repository.port.js';

/** The operational numbers the admin panel edits without reopening the event form. */
export interface EventConfigView {
  id: number;
  nombre: string;
  edicion: string;
  duracionReunion: number;
  tiempoEntreReuniones: number;
  cantidadTotalMesasEvento: number;
  capacidadPersonasPorMesa: number;
  maxParticipantesPorEmpresa: number;
  costoParticipanteExtra: number;
  cantidadParticipantesIncluidos: number;
  montoBaseIncripcionBolivianos: number;
  fechaInicioEvento: Date;
  fechaFinEvento: Date;
}

@Injectable()
export class GetCurrentEventConfigUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort) {}

  async execute(): Promise<EventConfigView> {
    const event = await this.events.findPrincipal();
    if (!event) throw new NotFoundError('No hay evento principal configurado.');
    return toConfigView(event);
  }
}

export function toConfigView(event: EventRecord): EventConfigView {
  return {
    id: event.id,
    nombre: event.nombre,
    edicion: event.edicion,
    duracionReunion: event.duracionReunion,
    tiempoEntreReuniones: event.tiempoEntreReuniones,
    cantidadTotalMesasEvento: event.cantidadTotalMesasEvento,
    capacidadPersonasPorMesa: event.capacidadPersonasPorMesa,
    maxParticipantesPorEmpresa: event.maxParticipantesPorEmpresa,
    costoParticipanteExtra: event.costoParticipanteExtra,
    cantidadParticipantesIncluidos: event.cantidadParticipantesIncluidos,
    montoBaseIncripcionBolivianos: event.montoBaseIncripcionBolivianos,
    fechaInicioEvento: event.fechaInicioEvento,
    fechaFinEvento: event.fechaFinEvento,
  };
}
