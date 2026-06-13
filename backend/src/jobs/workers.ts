import { Worker } from 'bullmq';
import { createRedis } from '../core/redis/index';
import { logger } from '../core/logger/index';
import {
  QueueName,
  type AttachmentScanJobData,
  type EmailJobData,
  type TicketJobData,
} from './types';
import { processEmail } from './processors/email.processor';
import {
  processAutoClose,
  processResolutionReminder,
} from './processors/ticket-lifecycle.processor';
import { processAttachmentScan } from './processors/attachment-scan.processor';

const workers: Worker[] = [];

// Each BullMQ worker needs its own (blocking) connection.
const newConnection = () => createRedis({ maxRetriesPerRequest: null });

export function startWorkers(): void {
  workers.push(
    new Worker<EmailJobData>(
      QueueName.Email,
      async (job) => {
        await processEmail(job.data);
      },
      { connection: newConnection() },
    ),
    new Worker<TicketJobData>(
      QueueName.TicketReminder,
      async (job) => {
        await processResolutionReminder(job.data.ticketId);
      },
      { connection: newConnection() },
    ),
    new Worker<TicketJobData>(
      QueueName.TicketAutoClose,
      async (job) => {
        await processAutoClose(job.data.ticketId);
      },
      { connection: newConnection() },
    ),
    new Worker<AttachmentScanJobData>(
      QueueName.AttachmentScan,
      async (job) => {
        await processAttachmentScan(job.data);
      },
      { connection: newConnection() },
    ),
  );

  for (const worker of workers) {
    worker.on('failed', (job, err) =>
      logger.error(
        { queue: worker.name, jobId: job?.id, attemptsMade: job?.attemptsMade, err: err.message },
        'Job failed',
      ),
    );
    worker.on('completed', (job) =>
      logger.debug({ queue: worker.name, jobId: job.id }, 'Job completed'),
    );
  }

  logger.info({ queues: workers.map((w) => w.name) }, 'BullMQ workers started');
}

export async function stopWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
}
