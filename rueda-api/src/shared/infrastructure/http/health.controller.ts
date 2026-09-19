import { Controller, Get } from '@nestjs/common';
import { Public } from './decorators/public.decorator.js';

@Controller()
export class HealthController {
  /** Public liveness probe, same route the legacy backend exposed. */
  @Public()
  @Get()
  health(): { status: string } {
    return { status: 'ok' };
  }
}
