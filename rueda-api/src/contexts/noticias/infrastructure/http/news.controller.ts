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
import type { AuthenticatedUser } from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  DeleteNewsUseCase,
  PublishNewsUseCase,
  UpdateNewsUseCase,
} from '../../application/use-cases/manage-news.use-cases.js';
import {
  ListAllNewsUseCase,
  ListPublishedNewsUseCase,
} from '../../application/use-cases/read-news.use-cases.js';
import type { NewsRecord } from '../../domain/ports/news.repository.port.js';
import { ListNewsQueryDto, SaveNewsDto } from './dto/news.dto.js';

/** Content staff: the roles the legacy guard let curate `/admin/noticias`. */
const CONTENT_STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;
const EVERYONE = [...CONTENT_STAFF, ROLES.EMPRESA] as const;

/**
 * The announcement board of the event.
 *
 * Replaces `GET|POST /admin/noticias`, `PUT|DELETE /admin/noticias/:id`,
 * `GET /tecnico/noticias` and `GET /empresa/comunicados`. The three lists
 * collapse into two: everybody reads the published board, and the staff has the
 * editorial one that also shows drafts.
 *
 * The author is taken from the token. The legacy endpoint read `usuario_id`
 * from the body and fell back to user 1 when it was missing, so a piece could
 * end up signed by somebody who never wrote it.
 */
@Controller('news')
export class NewsController {
  constructor(
    private readonly listPublished: ListPublishedNewsUseCase,
    private readonly listAll: ListAllNewsUseCase,
    private readonly publishNews: PublishNewsUseCase,
    private readonly updateNews: UpdateNewsUseCase,
    private readonly deleteNews: DeleteNewsUseCase,
  ) {}

  // The literal route is declared before the parametrised ones.

  @Roles(...EVERYONE)
  @Get()
  list(@Query() query: ListNewsQueryDto): Promise<NewsRecord[]> {
    return this.listPublished.execute(query.eventId);
  }

  /** The editorial list, drafts included. */
  @Roles(...CONTENT_STAFF)
  @Get('all')
  all(@Query() query: ListNewsQueryDto): Promise<NewsRecord[]> {
    return this.listAll.execute(query.eventId);
  }

  @Roles(...CONTENT_STAFF)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveNewsDto,
  ): Promise<NewsRecord> {
    return this.publishNews.execute(user.id, dto);
  }

  @Roles(...CONTENT_STAFF)
  @Put(':newsId')
  update(
    @Param('newsId', ParseIntPipe) newsId: number,
    @Body() dto: SaveNewsDto,
  ): Promise<NewsRecord> {
    return this.updateNews.execute(newsId, dto);
  }

  @Roles(...CONTENT_STAFF)
  @Delete(':newsId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('newsId', ParseIntPipe) newsId: number): Promise<void> {
    return this.deleteNews.execute(newsId);
  }
}
