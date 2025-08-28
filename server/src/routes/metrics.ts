import type { FastifyInstance } from 'fastify';
import { register } from '../metrics.js';
export async function registerMetrics(app: FastifyInstance){
  app.get('/metrics', async (_req, reply)=>{
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
}
