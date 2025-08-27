import 'dotenv/config';
import Fastify from 'fastify';
import helmet from 'fastify-helmet';
import cors from 'fastify-cors';
import { logger } from './logger.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerModelsRoutes } from './routes/models.js';
import { registerUsageRoutes } from './routes/usage.js';
import { registerIGRoutes } from './routes/ig.js';
import { registerIgRulesRoutes } from './routes/igRules.js';
import { registerIgAdminRoutes } from './routes/igAdmin.js';

const app = Fastify({ logger });

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, { origin: true });

app.get('/api/health', async () => ({ ok: true, ts: new Date().toISOString() }));

await registerSettingsRoutes(app);
await registerChatRoutes(app);
await registerModelsRoutes(app);
await registerUsageRoutes(app);
await registerIGRoutes(app);
await registerIgRulesRoutes(app);
await registerIgAdminRoutes(app);

const port = Number(process.env.API_PORT ?? 8787);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`API listening on :${port}`);
});
