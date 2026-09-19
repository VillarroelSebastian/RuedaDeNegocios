import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../../../shared/infrastructure/http/decorators/public.decorator.js';
import { RateLimit } from '../../../../shared/infrastructure/http/decorators/rate-limit.decorator.js';
import {
  type AvailabilityResult,
  CheckAvailabilityUseCase,
} from '../../application/use-cases/check-availability.use-case.js';
import { ListRegistrationCitiesUseCase } from '../../application/use-cases/list-registration-cities.use-case.js';
import {
  RegisterCompanyUseCase,
  type RegistrationReceipt,
} from '../../application/use-cases/register-company.use-case.js';
import {
  GetEnrollmentTrackingUseCase,
  ResubmitReceiptUseCase,
} from '../../application/use-cases/track-enrollment.use-cases.js';
import type {
  CityOption,
  TrackedEnrollment,
} from '../../domain/ports/registration.repository.port.js';
import {
  AvailabilityQueryDto,
  RegisterCompanyDto,
  ResubmitReceiptDto,
  TrackingQueryDto,
} from './dto/registration.dto.js';

/** Registering is a slow, deliberate act; a flood of them is not. */
const SUBMISSION_LIMIT = { attempts: 5, windowMs: 60 * 60 * 1000 };

/**
 * The only unauthenticated write surface of the API: a company registers for
 * the event and then follows that registration through a signed link, with no
 * account until its payment is approved.
 *
 * Replaces `GET /public/verificar-empresa`, `GET /public/ciudades`,
 * `POST /public/registro`, `GET /public/seguimiento` and
 * `POST /public/seguimiento/:id/comprobante`. The tracking token now always
 * travels as `?t=`, never inside the body.
 */
@Public()
@Controller('registration')
export class RegistrationController {
  constructor(
    private readonly checkAvailability: CheckAvailabilityUseCase,
    private readonly listCities: ListRegistrationCitiesUseCase,
    private readonly registerCompany: RegisterCompanyUseCase,
    private readonly getTracking: GetEnrollmentTrackingUseCase,
    private readonly resubmitReceipt: ResubmitReceiptUseCase,
  ) {}

  // The literal routes are declared before the parametrised one.

  @Get('availability')
  availability(@Query() query: AvailabilityQueryDto): Promise<AvailabilityResult> {
    return this.checkAvailability.execute(query);
  }

  @Get('cities')
  cities(): Promise<CityOption[]> {
    return this.listCities.execute();
  }

  @RateLimit(SUBMISSION_LIMIT)
  @Post()
  register(@Body() dto: RegisterCompanyDto): Promise<RegistrationReceipt> {
    return this.registerCompany.execute({
      empresa: dto.empresa,
      paqueteId: dto.paqueteId,
      urlComprobante: dto.urlComprobante ?? null,
      participantes: dto.participantes,
    });
  }

  @Get('tracking/:companyEventId')
  tracking(
    @Param('companyEventId', ParseIntPipe) companyEventId: number,
    @Query() query: TrackingQueryDto,
  ): Promise<TrackedEnrollment> {
    return this.getTracking.execute(companyEventId, query.t);
  }

  @RateLimit(SUBMISSION_LIMIT)
  @Post('tracking/:companyEventId/receipt')
  @HttpCode(HttpStatus.NO_CONTENT)
  replaceReceipt(
    @Param('companyEventId', ParseIntPipe) companyEventId: number,
    @Query() query: TrackingQueryDto,
    @Body() dto: ResubmitReceiptDto,
  ): Promise<void> {
    return this.resubmitReceipt.execute(companyEventId, query.t, dto.urlComprobante);
  }
}
