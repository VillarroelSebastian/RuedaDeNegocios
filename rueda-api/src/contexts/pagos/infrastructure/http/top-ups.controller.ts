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
import {
  type AuthenticatedUser,
  enrollmentOf,
} from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  ApproveTopUpUseCase,
  ListOwnTopUpsUseCase,
  ListTopUpsUnderReviewUseCase,
  ObserveTopUpUseCase,
  QuoteTopUpUseCase,
  RejectTopUpUseCase,
  RequestTopUpUseCase,
} from '../../application/use-cases/top-up.use-cases.js';
import type {
  TopUpQuote,
  TopUpRequest,
  TopUpUnderReview,
} from '../../domain/ports/payments.repository.port.js';
import {
  ListTopUpsQueryDto,
  ObservationDto,
  RequestTopUpDto,
  TopUpQuoteQueryDto,
  TopUpRejectionDto,
} from './dto/payment.dto.js';

/** Purchases of extra participant slots, separate from the registration payment. */
@Controller('top-ups')
export class TopUpsController {
  constructor(
    private readonly quote: QuoteTopUpUseCase,
    private readonly request: RequestTopUpUseCase,
    private readonly listOwn: ListOwnTopUpsUseCase,
    private readonly listUnderReview: ListTopUpsUnderReviewUseCase,
    private readonly approve: ApproveTopUpUseCase,
    private readonly reject: RejectTopUpUseCase,
    private readonly observe: ObserveTopUpUseCase,
  ) {}

  // Literal routes first, so `:topUpId` never captures them.

  /** What extra slots would cost, and the QR to pay them with. */
  @Roles(ROLES.EMPRESA)
  @Get('quote')
  quoteSlots(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TopUpQuoteQueryDto,
  ): Promise<TopUpQuote> {
    return this.quote.execute(enrollmentOf(user), query.cantidad);
  }

  @Roles(ROLES.ADMIN)
  @Get('review')
  underReview(@Query() query: ListTopUpsQueryDto): Promise<TopUpUnderReview[]> {
    return this.listUnderReview.execute(query.estado);
  }

  @Roles(ROLES.EMPRESA)
  @Get()
  own(@CurrentUser() user: AuthenticatedUser): Promise<TopUpRequest[]> {
    return this.listOwn.execute(enrollmentOf(user));
  }

  @Roles(ROLES.EMPRESA)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  requestSlots(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestTopUpDto,
  ): Promise<{ comprobanteId: number; montoPago: number }> {
    return this.request.execute({
      companyEventId: enrollmentOf(user),
      userId: user.id,
      cantidadParticipantes: dto.cantidadParticipantes,
      urlComprobante: dto.urlComprobante,
    });
  }

  @Roles(ROLES.ADMIN)
  @Post(':topUpId/approval')
  approveSlots(
    @Param('topUpId', ParseIntPipe) topUpId: number,
  ): Promise<{ nuevoTotalSlots: number }> {
    return this.approve.execute(topUpId);
  }

  @Roles(ROLES.ADMIN)
  @Post(':topUpId/rejection')
  @HttpCode(HttpStatus.NO_CONTENT)
  rejectSlots(
    @Param('topUpId', ParseIntPipe) topUpId: number,
    @Body() dto: TopUpRejectionDto,
  ): Promise<void> {
    return this.reject.execute(topUpId, dto.motivo);
  }

  @Roles(ROLES.ADMIN)
  @Post(':topUpId/observation')
  @HttpCode(HttpStatus.NO_CONTENT)
  observeSlots(
    @Param('topUpId', ParseIntPipe) topUpId: number,
    @Body() dto: ObservationDto,
  ): Promise<void> {
    return this.observe.execute(topUpId, dto.observacion);
  }
}

/** The caller's own enrollment, taken from the token rather than the request. */
