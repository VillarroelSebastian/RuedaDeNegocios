import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
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

export type UpdateEventCommand = EventSettingsInput & { reglasQR?: unknown };

@Injectable()
export class UpdateEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort,
    @Inject(TABLE_PROVISIONING_PORT) private readonly tables: TableProvisioningPort,
  ) {}

  async execute(id: number, command: UpdateEventCommand): Promise<EventRecord> {
    const existing = await this.events.findById(id);
    if (!existing) throw new NotFoundError('El evento no existe.');

    const settings = buildEventSettings(command);
    await this.events.update(id, settings);
    await this.tables.syncTables(
      id,
      settings.cantidadTotalMesasEvento,
      settings.capacidadPersonasPorMesa,
    );

    // Absent rules mean "leave them alone"; an empty array means "remove them".
    if (Array.isArray(command.reglasQR)) {
      await this.events.replaceQrRules(id, sanitizeQrRules(command.reglasQR));
    }

    const updated = await this.events.findById(id, { withQrRules: true });
    if (!updated) throw new NotFoundError('El evento no existe.');
    return updated;
  }
}
