import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  CheckCredentialUseCase,
  type CheckedCredential,
} from '../../application/use-cases/check-credential.use-case.js';
import { ListAttendanceUseCase } from '../../application/use-cases/list-attendance.use-case.js';
import {
  type RecordAttendanceResult,
  RecordAttendanceUseCase,
} from '../../application/use-cases/record-attendance.use-case.js';
import { CheckCredentialQueryDto, ListAttendanceQueryDto, RecordAttendanceDto } from './dto/attendance.dto.js';

const STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly record: RecordAttendanceUseCase,
    private readonly check: CheckCredentialUseCase,
    private readonly list: ListAttendanceUseCase,
  ) {}

  /**
   * Read-only preview of a scanned badge, so staff can decide before writing
   * anything. Replaces `GET /tecnico/credenciales/verificar`.
   */
  @Roles(...STAFF)
  @Get('check')
  checkCredential(@Query() query: CheckCredentialQueryDto): Promise<CheckedCredential> {
    return this.check.execute(query.companyUserId, query.token);
  }

  /** Replaces `GET /tecnico/asistencias`. */
  @Roles(...STAFF)
  @Get()
  listScans(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAttendanceQueryDto,
  ): Promise<unknown[]> {
    return this.list.execute({ staffUserId: user.id, companyEventId: query.companyEventId });
  }

  /** Replaces `POST /tecnico/asistencias`. */
  @Roles(...STAFF)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  recordScan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordAttendanceDto,
  ): Promise<RecordAttendanceResult> {
    return this.record.execute({
      staffUserId: user.id,
      companyUserId: dto.companyUserId,
      token: dto.token,
    });
  }
}
