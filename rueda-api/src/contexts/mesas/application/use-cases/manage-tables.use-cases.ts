import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  TABLES_REPOSITORY,
  type TableEventConfig,
  type TablePatch,
  type TableSummary,
  type TablesRepositoryPort,
} from '../../domain/ports/tables.repository.port.js';

const NO_EVENT = 'No hay evento principal configurado';
const NOT_IN_EVENT = 'Mesa no encontrada en el evento activo';

/** A venue has a floor, not an arena: adding a hundred tables is a typo. */
const MAX_TABLES_AT_ONCE = 100;
/** `capacidadPersonas` is a SmallInt, and a table nobody fits at is not one. */
const MAX_SEATS = 999;

async function currentEvent(tables: TablesRepositoryPort): Promise<TableEventConfig> {
  const event = await tables.findPrincipalEvent();
  if (!event) throw new ValidationError(NO_EVENT);
  return event;
}

export interface TablesAdded {
  creadas: number;
  /** What the event declares afterwards, which is what provisioning follows. */
  totalMesas: number;
}

/**
 * Adds tables to the floor. The legacy endpoint appended them past the capacity
 * the event declared, and the next sync then deactivated exactly the tables it
 * had just created. Raising the declared capacity is what actually adds a table.
 */
@Injectable()
export class AddTablesUseCase {
  constructor(@Inject(TABLES_REPOSITORY) private readonly tables: TablesRepositoryPort) {}

  async execute(cantidad: number, capacidadPersonas?: number): Promise<TablesAdded> {
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_TABLES_AT_ONCE) {
      throw new ValidationError(`La cantidad de mesas debe estar entre 1 y ${MAX_TABLES_AT_ONCE}.`);
    }

    const event = await currentEvent(this.tables);
    const capacity = capacidadPersonas ?? event.capacidadPersonasPorMesa;
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_SEATS) {
      throw new ValidationError('La capacidad de la mesa no es válida.');
    }

    const totalMesas = event.cantidadTotalMesasEvento + cantidad;
    await this.tables.setTableTotal(event.id, totalMesas, capacity);

    return { creadas: cantidad, totalMesas };
  }
}

/**
 * Changes the seats of a table or whether it may be booked at all. Merges the
 * legacy `PUT /admin/mesas/:id` and `PUT /admin/mesas/:id/habilitar`, which
 * wrote two columns of the same row through two endpoints.
 */
@Injectable()
export class UpdateTableUseCase {
  constructor(@Inject(TABLES_REPOSITORY) private readonly tables: TablesRepositoryPort) {}

  async execute(tableId: number, patch: TablePatch): Promise<TableSummary> {
    if (patch.capacidadPersonas === undefined && patch.estaHabilitada === undefined) {
      throw new ValidationError('No hay nada que cambiar en la mesa.');
    }
    if (
      patch.capacidadPersonas !== undefined &&
      (!Number.isInteger(patch.capacidadPersonas) ||
        patch.capacidadPersonas < 1 ||
        patch.capacidadPersonas > MAX_SEATS)
    ) {
      throw new ValidationError('La capacidad de la mesa no es válida.');
    }

    const event = await currentEvent(this.tables);
    const existing = await this.tables.findTable(tableId, event.id);
    if (!existing) throw new NotFoundError(NOT_IN_EVENT);

    return this.tables.updateTable(tableId, patch);
  }
}

/** Retires the table. History keeps it; the floor stops showing it. */
@Injectable()
export class RemoveTableUseCase {
  constructor(@Inject(TABLES_REPOSITORY) private readonly tables: TablesRepositoryPort) {}

  async execute(tableId: number): Promise<void> {
    const event = await currentEvent(this.tables);

    const existing = await this.tables.findTable(tableId, event.id);
    if (!existing) throw new NotFoundError(NOT_IN_EVENT);

    await this.tables.deactivateTable(tableId);
  }
}
