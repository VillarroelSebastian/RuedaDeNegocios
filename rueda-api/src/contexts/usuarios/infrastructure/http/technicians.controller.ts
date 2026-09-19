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
} from '@nestjs/common';
import { ROLES } from '../../../../shared/domain/role.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  CreateTechnicianUseCase,
  type CreatedTechnician,
  DeleteTechnicianUseCase,
  ListTechniciansUseCase,
  ResendTechnicianCredentialsUseCase,
  UpdateTechnicianUseCase,
} from '../../application/use-cases/manage-technicians.use-cases.js';
import type { TechnicianRecord } from '../../domain/ports/staff.repository.port.js';
import { SaveTechnicianDto } from './dto/staff.dto.js';

/**
 * The accounts of the event team.
 *
 * Replaces `GET|POST /admin/tecnicos`, `PUT|DELETE /admin/tecnicos/:id` and
 * `POST /admin/tecnicos/:id/reenviar-credenciales`.
 */
@Roles(ROLES.ADMIN)
@Controller('technicians')
export class TechniciansController {
  constructor(
    private readonly listTechnicians: ListTechniciansUseCase,
    private readonly createTechnician: CreateTechnicianUseCase,
    private readonly updateTechnician: UpdateTechnicianUseCase,
    private readonly deleteTechnician: DeleteTechnicianUseCase,
    private readonly resendCredentials: ResendTechnicianCredentialsUseCase,
  ) {}

  @Get()
  list(): Promise<TechnicianRecord[]> {
    return this.listTechnicians.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: SaveTechnicianDto): Promise<CreatedTechnician> {
    return this.createTechnician.execute(dto);
  }

  @Put(':technicianId')
  update(
    @Param('technicianId', ParseIntPipe) technicianId: number,
    @Body() dto: SaveTechnicianDto,
  ): Promise<TechnicianRecord> {
    return this.updateTechnician.execute(technicianId, dto);
  }

  @Delete(':technicianId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('technicianId', ParseIntPipe) technicianId: number): Promise<void> {
    return this.deleteTechnician.execute(technicianId);
  }

  /** Mints a new password and mails it, keeping the old one if it fails. */
  @Post(':technicianId/credentials')
  @HttpCode(HttpStatus.NO_CONTENT)
  resend(@Param('technicianId', ParseIntPipe) technicianId: number): Promise<void> {
    return this.resendCredentials.execute(technicianId);
  }
}
