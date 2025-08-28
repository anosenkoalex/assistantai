import 'dotenv/config';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerModelsRoutes } from './routes/models.js';
import { registerUsageRoutes } from './routes/usage.js';
import { registerIGRoutes } from './routes/ig.js';
import { registerIgRulesRoutes } from './routes/igRules.js';
import { registerIgAdminRoutes } from './routes/igAdmin.js';
import { registerIgSettingsRoutes } from './routes/igSettings.js';
import { registerFlowRoutes } from './routes/flows.js';
import { registerFlowBatchRoutes } from './routes/flowBatch.js';
import { runFlowTicker } from './jobs/flowTicker.js';
import { runOutboxWorker } from './jobs/outboxWorker.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerErrorsAdminRoutes } from './routes/errorsAdmin.js';

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, { origin: true, credentials: true });
await app.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute',
});

app.get('/api/health', async () => ({ ok: true, ts: new Date().toISOString() }));

await registerSettingsRoutes(app);
await registerChatRoutes(app);
await registerModelsRoutes(app);
await registerUsageRoutes(app);
await registerIGRoutes(app);
await registerIgRulesRoutes(app);
await registerIgAdminRoutes(app);
await registerIgSettingsRoutes(app);
await registerFlowRoutes(app);
await registerFlowBatchRoutes(app);
await registerHealthRoutes(app);
await registerErrorsAdminRoutes(app);

const port = Number(process.env.API_PORT ?? 8787);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`API listening on :${port}`);
});

setInterval(() => { runFlowTicker().catch(err => app.log.error(err)); }, 5_000);
setInterval(() => runOutboxWorker().catch(e => app.log.error(e)), 5_000);
