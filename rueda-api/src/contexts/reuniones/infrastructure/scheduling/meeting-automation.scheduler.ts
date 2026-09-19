import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  SendMeetingRemindersUseCase,
  SyncMeetingStatesUseCase,
} from '../../application/use-cases/meeting-automation.use-cases.js';

/** A meeting starts and ends on its hour, so the state is checked often. */
const SYNC_EVERY_MS = 15_000;
/** Reminders only have to land inside their half-hour window. */
const REMIND_EVERY_MS = 30_000;

/**
 * The clock of the event. It owns no rule: it only asks the use cases to run,
 * and makes sure a failure is logged rather than left to kill the timer.
 */
@Injectable()
export class MeetingAutomationScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(MeetingAutomationScheduler.name);

  constructor(
    private readonly sync: SyncMeetingStatesUseCase,
    private readonly reminders: SendMeetingRemindersUseCase,
  ) {}

  /**
   * A restart is the one moment worth sweeping the whole event: while the
   * application was down, links may have gone missing and hours may have passed.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.run('review pending links', () => this.sync.reviewPendingLinks());
    await this.run('sync meeting states', () => this.sync.execute());
  }

  @Interval(SYNC_EVERY_MS)
  async syncStates(): Promise<void> {
    await this.run('sync meeting states', () => this.sync.execute());
  }

  @Interval(REMIND_EVERY_MS)
  async sendReminders(): Promise<void> {
    await this.run('send meeting reminders', () => this.reminders.execute());
  }

  /** One failed pass is logged and forgotten; the next one runs regardless. */
  private async run(what: string, job: () => Promise<void>): Promise<void> {
    try {
      await job();
    } catch (error) {
      this.logger.warn(`Could not ${what}: ${String(error)}`);
    }
  }
}
