import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import { config } from '../config.js';
import { log } from '../util/logger.js';
import { handleDetectionJob, handleIncidentJob } from './workflows.js';

const connection = { connection: config.redisUrl };

export const detectionQueue = new Queue('detection', connection);
export const incidentQueue = new Queue('incident', connection);
export const detectionEvents = new QueueEvents('detection', connection);
export const incidentEvents = new QueueEvents('incident', connection);

export function startWorkers() {
  new Worker(
    'detection',
    async () => {
      await handleDetectionJob();
    },
    { ...connection, concurrency: 1 },
  );

  new Worker(
    'incident',
    async (job) => {
      await handleIncidentJob(job.data);
    },
    { ...connection, concurrency: 2 },
  );

  detectionEvents.on('failed', ({ failedReason }) =>
    log.error('detection job failed', { failedReason }),
  );
  incidentEvents.on('failed', ({ failedReason, jobId }) =>
    log.error('incident job failed', { failedReason, jobId }),
  );
}

export async function enqueueDetection(opts?: JobsOptions) {
  await detectionQueue.add('detect', {}, opts);
}

export async function enqueueIncident(data: unknown, opts?: JobsOptions) {
  await incidentQueue.add('incident', data, opts);
}

