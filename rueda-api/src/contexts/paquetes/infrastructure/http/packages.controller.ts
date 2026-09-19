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
import {
  type AuthenticatedUser,
  enrollmentOf,
} from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Public } from '../../../../shared/infrastructure/http/decorators/public.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  CreatePackageUseCase,
  DeletePackageUseCase,
  GetOwnPackageUseCase,
  ListPackageUsageUseCase,
  ListPackagesUseCase,
  UpdatePackageUseCase,
} from '../../application/use-cases/manage-packages.use-cases.js';
import type {
  OwnPackageView,
  PackageRecord,
  PackageUsage,
} from '../../domain/ports/packages.repository.port.js';
import { ListPackagesQueryDto, SavePackageDto } from './dto/package.dto.js';

/**
 * What a company buys to take part: the price, the credentials it includes and
 * the benefits that come with it.
 *
 * Replaces `GET /public/paquetes`, `GET|POST /admin/paquetes`,
 * `PUT|DELETE /admin/paquetes/:id` and `GET /empresa/mi-paquete`.
 *
 * The catalogue and its sales figures are two resources, not one: how many
 * companies bought each package is not something the public page should carry.
 */
@Controller('packages')
export class PackagesController {
  constructor(
    private readonly listPackages: ListPackagesUseCase,
    private readonly listUsage: ListPackageUsageUseCase,
    private readonly getOwn: GetOwnPackageUseCase,
    private readonly createPackage: CreatePackageUseCase,
    private readonly updatePackage: UpdatePackageUseCase,
    private readonly deletePackage: DeletePackageUseCase,
  ) {}

  // The literal routes are declared before the parametrised ones.

  /** The catalogue, read by the registration form before anybody signs in. */
  @Public()
  @Get()
  list(@Query() query: ListPackagesQueryDto): Promise<PackageRecord[]> {
    return this.listPackages.execute(query.eventId);
  }

  /** What the company bought, and how much of it is still free. */
  @Roles(ROLES.EMPRESA)
  @Get('mine')
  mine(@CurrentUser() user: AuthenticatedUser): Promise<OwnPackageView> {
    return this.getOwn.execute(enrollmentOf(user));
  }

  @Roles(ROLES.ADMIN)
  @Get('usage')
  usage(@Query() query: ListPackagesQueryDto): Promise<PackageUsage[]> {
    return this.listUsage.execute(query.eventId);
  }

  @Roles(ROLES.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: SavePackageDto): Promise<PackageRecord> {
    return this.createPackage.execute(dto, dto.eventId);
  }

  @Roles(ROLES.ADMIN)
  @Put(':packageId')
  update(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Body() dto: SavePackageDto,
  ): Promise<PackageRecord> {
    return this.updatePackage.execute(packageId, dto);
  }

  @Roles(ROLES.ADMIN)
  @Delete(':packageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('packageId', ParseIntPipe) packageId: number): Promise<void> {
    return this.deletePackage.execute(packageId);
  }
}
