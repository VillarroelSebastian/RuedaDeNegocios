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
  AnnounceOnActivityUseCase,
  RemoveActivityAnnouncementUseCase,
  SetActivitySubscriptionUseCase,
  SetLiveStatusUseCase,
} from '../../application/use-cases/live-schedule.use-cases.js';
import {
  CreateActivityUseCase,
  DeleteActivityUseCase,
  UpdateActivityUseCase,
} from '../../application/use-cases/manage-activities.use-cases.js';
import {
  GetLiveScheduleUseCase,
  ListActivitiesUseCase,
  type LiveSchedule,
  ListOwnSubscriptionsUseCase,
  ListUpcomingActivitiesUseCase,
} from '../../application/use-cases/read-activities.use-cases.js';
import type {
  ActivityAnnouncement,
  ActivityRecord,
} from '../../domain/ports/activities.repository.port.js';
import {
  AnnouncementDto,
  ListActivitiesQueryDto,
  LiveStatusDto,
  SaveActivityDto,
  SubscriptionDto,
  UpcomingActivitiesQueryDto,
} from './dto/activity.dto.js';

/** Content staff: the roles the legacy guard let curate `/admin/actividades`. */
const CONTENT_STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;

/**
 * The programme of the event and the live schedule that runs on top of it.
 *
 * Replaces `GET /public/actividades`, `GET /admin/actividades`,
 * `GET /tecnico/actividades`, `GET /empresa/actividades`,
 * `POST|PUT|DELETE /admin/actividades`, and the five `cronograma-vivo` routes of
 * the extras controller. The four list endpoints collapse into one: they served
 * the same rows under four different field names.
 *
 * The live schedule no longer carries a `suscrito` flag per activity, because
 * that made a public endpoint answer questions about a company named in the
 * query string. A company reads its own subscriptions from
 * `GET /activities/subscriptions`, which is scoped to its token.
 */
@Controller('activities')
export class ActivitiesController {
  constructor(
    private readonly listActivities: ListActivitiesUseCase,
    private readonly listUpcoming: ListUpcomingActivitiesUseCase,
    private readonly getLiveSchedule: GetLiveScheduleUseCase,
    private readonly listOwnSubscriptions: ListOwnSubscriptionsUseCase,
    private readonly createActivity: CreateActivityUseCase,
    private readonly updateActivity: UpdateActivityUseCase,
    private readonly deleteActivity: DeleteActivityUseCase,
    private readonly setSubscription: SetActivitySubscriptionUseCase,
    private readonly announce: AnnounceOnActivityUseCase,
    private readonly removeAnnouncement: RemoveActivityAnnouncementUseCase,
    private readonly setLiveStatus: SetLiveStatusUseCase,
  ) {}

  // The literal routes are declared before the parametrised ones.

  @Public()
  @Get()
  list(@Query() query: ListActivitiesQueryDto): Promise<ActivityRecord[]> {
    return this.listActivities.execute(query.eventId);
  }

  /** What the staff dashboard shows. Replaces `GET /tecnico/actividades`. */
  @Roles(...CONTENT_STAFF)
  @Get('upcoming')
  upcoming(@Query() query: UpcomingActivitiesQueryDto): Promise<ActivityRecord[]> {
    return this.listUpcoming.execute(query.limit);
  }

  /** Watched by everyone during the event, signed in or not. */
  @Public()
  @Get('live')
  live(): Promise<LiveSchedule> {
    return this.getLiveSchedule.execute();
  }

  @Roles(ROLES.EMPRESA)
  @Get('subscriptions')
  subscriptions(@CurrentUser() user: AuthenticatedUser): Promise<number[]> {
    return this.listOwnSubscriptions.execute(enrollmentOf(user));
  }

  @Roles(...CONTENT_STAFF)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: SaveActivityDto): Promise<ActivityRecord> {
    return this.createActivity.execute(dto);
  }

  @Roles(...CONTENT_STAFF)
  @Delete('announcements/:announcementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAnnouncement(
    @Param('announcementId', ParseIntPipe) announcementId: number,
  ): Promise<void> {
    return this.removeAnnouncement.execute(announcementId);
  }

  @Roles(...CONTENT_STAFF)
  @Put(':activityId')
  update(
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() dto: SaveActivityDto,
  ): Promise<ActivityRecord> {
    return this.updateActivity.execute(activityId, dto);
  }

  @Roles(...CONTENT_STAFF)
  @Delete(':activityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('activityId', ParseIntPipe) activityId: number): Promise<void> {
    return this.deleteActivity.execute(activityId);
  }

  /** The enrollment comes from the token, never from the request. */
  @Roles(ROLES.EMPRESA)
  @Put(':activityId/subscription')
  @HttpCode(HttpStatus.NO_CONTENT)
  subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() dto: SubscriptionDto,
  ): Promise<void> {
    return this.setSubscription.execute(activityId, enrollmentOf(user), dto.suscrito);
  }

  @Roles(...CONTENT_STAFF)
  @Post(':activityId/announcements')
  @HttpCode(HttpStatus.CREATED)
  createAnnouncement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() dto: AnnouncementDto,
  ): Promise<ActivityAnnouncement> {
    return this.announce.execute(activityId, user.id, dto.mensaje);
  }

  /** Answers with the whole schedule, which is what the screen re-renders. */
  @Roles(...CONTENT_STAFF)
  @Put(':activityId/live-status')
  liveStatus(
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() dto: LiveStatusDto,
  ): Promise<LiveSchedule> {
    return this.setLiveStatus.execute(activityId, dto.estadoEnVivo, dto.notaEnVivo);
  }
}
