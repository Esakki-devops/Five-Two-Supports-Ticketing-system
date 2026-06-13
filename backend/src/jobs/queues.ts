import { Queue, type JobsOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { config } from '../core/config/index';
import { logger } from '../core/logger/index';
import { createRedis, redis } from '../core/redis/index';
import {
  QueueName,
  type AttachmentScanJobData,
  type EmailJobData,
  type TicketJobData,
} from './types';

let connection: Redis | undefined;
function getConnection(): Redis {
  // BullMQ requires `maxRetriesPerRequest: null` on its connection.
  if (!connection) connection = createRedis({ maxRetriesPerRequest: null });
  return connection;
}

const defaultJobOptions: JobsOptions = {
  attempts: config.jobs.attempts,
  backoff: { type: 'exponential', delay: config.jobs.backoffMs },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 }, // failed jobs are retained as a dead-letter set
};

const queues = new Map<string, Queue>();
function getQueue(name: string): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: getConnection(), defaultJobOptions });
    queues.set(name, queue);
  }
  return queue;
}

/** Redis reachability proxy — when false, enqueues are skipped (never block a request). */
export function isQueueReady(): boolean {
  return redis.status === 'ready';
}

async function enqueue(
  name: string,
  jobName: string,
  data: object,
  opts?: JobsOptions,
): Promise<void> {
  if (!isQueueReady()) {
    logger.warn({ queue: name, job: jobName }, 'Redis not ready — job not enqueued');
    return;
  }
  try {
    await getQueue(name).add(jobName, data, opts);
  } catch (err) {
    logger.error({ err, queue: name, job: jobName }, 'Failed to enqueue job');
  }
}

export function enqueueEmail(data: EmailJobData): void {
  void enqueue(QueueName.Email, 'send', data);
}

export function enqueueReminder(data: TicketJobData, delayMs: number): void {
  void enqueue(QueueName.TicketReminder, 'remind', data, { delay: delayMs });
}

export function enqueueAutoClose(data: TicketJobData, delayMs: number): void {
  void enqueue(QueueName.TicketAutoClose, 'autoClose', data, { delay: delayMs });
}

export function enqueueAttachmentScan(data: AttachmentScanJobData): void {
  void enqueue(QueueName.AttachmentScan, 'scan', data);
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  if (connection) {
    try {
      await connection.quit();
    } catch {
      connection.disconnect();
    }
  }
}
