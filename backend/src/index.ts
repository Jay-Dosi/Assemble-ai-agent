import express from 'express';
import bodyParser from 'body-parser';
import { config } from './config.js';
import { dbStore } from './db.js';
import { log } from './util/logger.js';
import { enqueueDetection, startWorkers } from './services/queue.js';

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
  if (!config.apiToken) return next();
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${config.apiToken}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/incidents', (_req, res) => res.json(dbStore.listIncidents()));
app.get('/events', (_req, res) => res.json(dbStore.listEvents()));

const port = process.env.PORT || 4000;

startWorkers();
enqueueDetection({ repeat: { every: config.detectionIntervalMs } }).catch((err) =>
  log.error('failed to enqueue detection', err),
);
enqueueDetection().catch((err) => log.error('failed to enqueue immediate detection', err));

app.listen(port, () => log.info(`Dependency Doctor backend listening on ${port}`));

