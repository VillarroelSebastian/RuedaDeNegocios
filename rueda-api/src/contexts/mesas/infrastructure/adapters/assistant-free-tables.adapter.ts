import { Injectable } from '@nestjs/common';
import type { FreeTablesPort } from '../../../asistente/application/ports/free-tables.port.js';
import type { AssistantTable } from '../../../asistente/domain/models/assistant-view.js';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { ListAvailableTablesUseCase } from '../../application/use-cases/read-tables.use-cases.js';

/**
 * Offers the assistant the tables that are free for a window. It reuses this
 * context's own reading, cleanup time included.
 */
@Injectable()
export class AssistantFreeTablesAdapter implements FreeTablesPort {
  constructor(private readonly tables: ListAvailableTablesUseCase) {}

  async listFree(window: TimeWindow): Promise<AssistantTable[]> {
    const free = await this.tables.execute(
      window.start.toISOString(),
      window.end.toISOString(),
    );

    return free.map((table) => ({ id: table.id, numeroMesa: table.numeroMesa }));
  }
}
