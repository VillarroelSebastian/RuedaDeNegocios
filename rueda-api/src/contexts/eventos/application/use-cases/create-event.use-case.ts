import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_REPOSITORY,
  type EventRecord,
  type EventRepositoryPort,
} from '../../domain/ports/event.repository.port.js';
import {
  TABLE_PROVISIONING_PORT,
  type TableProvisioningPort,
} from '../../domain/ports/table-provisioning.port.js';
import { type EventSettingsInput, buildEventSettings } from '../../domain/services/event-settings.js';
import { sanitizeQrRules } from '../../domain/services/qr-rules.js';

export type CreateEventCommand = EventSettingsInput & { reglasQR?: unknown };

@Injectable()
export class CreateEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort,
    @Inject(TABLE_PROVISIONING_PORT) private readonly tables: TableProvisioningPort,
  ) {}

  async execute(command: CreateEventCommand): Promise<EventRecord> {
    const settings = buildEventSettings(command);

    // A new event is never published on creation: it needs at least one
    // registration package before an administrator can promote it.
    const event = await this.events.create(settings, sanitizeQrRules(command.reglasQR));

    await this.tables.syncTables(
      event.id,
      event.cantidadTotalMesasEvento,
      event.capacidadPersonasPorMesa,
    );
    return event;
  }
}
