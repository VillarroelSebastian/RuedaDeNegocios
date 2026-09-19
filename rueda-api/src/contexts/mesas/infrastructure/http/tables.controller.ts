import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ROLES } from '../../../../shared/domain/role.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  AddTablesUseCase,
  RemoveTableUseCase,
  type TablesAdded,
  UpdateTableUseCase,
} from '../../application/use-cases/manage-tables.use-cases.js';
import {
  GetTableOccupancyUseCase,
  GetTableUseCase,
  ListAvailableTablesUseCase,
  ListTablesUseCase,
  type TableOccupancy,
  type TableView,
  type TablesView,
} from '../../application/use-cases/read-tables.use-cases.js';
import type { TableSummary } from '../../domain/ports/tables.repository.port.js';
import {
  AddTablesDto,
  AvailableTablesQueryDto,
  OccupancyQueryDto,
  UpdateTableDto,
} from './dto/table.dto.js';

const STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;
/** A company books a table, so it has to be able to see which ones are free. */
const BOOKERS = [...STAFF, ROLES.EMPRESA] as const;

/**
 * The floor of the event.
 *
 * Replaces `GET /admin/mesas/agenda`, `GET /admin/mesas`, `GET /tecnico/mesas`,
 * `GET /admin/mesas/:id`, `POST /admin/mesas/generar`, `PUT /admin/mesas/:id`,
 * `PUT /admin/mesas/:id/habilitar`, `DELETE /admin/mesas/:id`,
 * `GET /empresa/mesas-disponibles`, `GET /tecnico/mesas-disponibles` and
 * `GET /tecnico/mesas/:id/ocupacion`.
 *
 * `GET /admin/mesas/historial` and `GET /tecnico/mesas/historial` are not here:
 * they list finished meetings, not tables, and belong to the meetings context.
 */
@Controller('tables')
export class TablesController {
  constructor(
    private readonly listTables: ListTablesUseCase,
    private readonly listAvailable: ListAvailableTablesUseCase,
    private readonly getTable: GetTableUseCase,
    private readonly getOccupancy: GetTableOccupancyUseCase,
    private readonly addTables: AddTablesUseCase,
    private readonly updateTable: UpdateTableUseCase,
    private readonly removeTable: RemoveTableUseCase,
  ) {}

  // The literal route is declared before the parametrised ones.

  @Roles(...STAFF)
  @Get()
  list(): Promise<TablesView> {
    return this.listTables.execute();
  }

  @Roles(...BOOKERS)
  @Get('available')
  available(@Query() query: AvailableTablesQueryDto): Promise<TableSummary[]> {
    return this.listAvailable.execute(query.inicio, query.fin);
  }

  @Roles(ROLES.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  add(@Body() dto: AddTablesDto): Promise<TablesAdded> {
    return this.addTables.execute(dto.cantidad, dto.capacidadPersonas);
  }

  @Roles(...STAFF)
  @Get(':tableId')
  detail(@Param('tableId', ParseIntPipe) tableId: number): Promise<TableView> {
    return this.getTable.execute(tableId);
  }

  /** The only real constraint when booking a table by hand. */
  @Roles(...BOOKERS)
  @Get(':tableId/occupancy')
  occupancy(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Query() query: OccupancyQueryDto,
  ): Promise<TableOccupancy> {
    return this.getOccupancy.execute(tableId, query.fecha);
  }

  @Roles(ROLES.ADMIN)
  @Put(':tableId')
  update(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Body() dto: UpdateTableDto,
  ): Promise<TableSummary> {
    return this.updateTable.execute(tableId, dto);
  }

  @Roles(ROLES.ADMIN)
  @Delete(':tableId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('tableId', ParseIntPipe) tableId: number): Promise<void> {
    return this.removeTable.execute(tableId);
  }
}
