import { config } from '../core/config/index';
import { enqueueAutoClose, enqueueReminder } from './queues';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * On resolution, schedule a day-5 reminder and a day-7 auto-close. Both
 * processors re-check the ticket's current status, so no cancellation is needed
 * if the ticket leaves "resolved" first.
 */
export function scheduleResolutionFollowups(ticketId: string): void {
  enqueueReminder({ ticketId }, config.jobs.reminderDays * DAY_MS);
  enqueueAutoClose({ ticketId }, config.jobs.autoCloseDays * DAY_MS);
}
