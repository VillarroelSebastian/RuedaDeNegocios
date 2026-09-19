import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import type { AssistantTable } from '../../domain/models/assistant-view.js';

/**
 * Tables the company may pick from while booking. Implemented by the tables
 * context, which owns what a table is busy with.
 */
export interface FreeTablesPort {
  listFree(window: TimeWindow): Promise<AssistantTable[]>;
}

export const FREE_TABLES_PORT = Symbol('FreeTablesPort');
