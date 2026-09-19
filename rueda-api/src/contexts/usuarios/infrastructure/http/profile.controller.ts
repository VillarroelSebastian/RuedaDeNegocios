import { Body, Controller, Get, Put } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  GetOwnProfileUseCase,
  type UpdatedProfile,
  UpdateOwnProfileUseCase,
} from '../../application/use-cases/own-profile.use-cases.js';
import type { ProfileRecord } from '../../domain/ports/staff.repository.port.js';
import { UpdateProfileDto } from './dto/staff.dto.js';

const EVERYONE = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS, ROLES.EMPRESA] as const;

/**
 * The caller's own account details.
 *
 * Replaces `GET|PUT /admin/perfil/:id`, which took the id from the path and let
 * the guard decide whose profile it really was. Here it is always the caller's,
 * and an administrator curating a technician does it through `/technicians/:id`.
 *
 * Passwords are not changed here: that is what `PATCH /auth/me/password` is for.
 */
@Roles(...EVERYONE)
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly getProfile: GetOwnProfileUseCase,
    private readonly updateProfile: UpdateOwnProfileUseCase,
  ) {}

  @Get()
  read(@CurrentUser() user: AuthenticatedUser): Promise<ProfileRecord> {
    return this.getProfile.execute(user.id);
  }

  @Put()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UpdatedProfile> {
    return this.updateProfile.execute(user.id, dto);
  }
}
