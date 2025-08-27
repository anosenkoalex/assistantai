import { FastifyInstance } from 'fastify';
export async function registerSettingsRoutes(app: FastifyInstance) {
  // TODO: implement settings routes
}

// Временная заглушка: ключ берём из переменной окружения
export async function getApiKeyFromDB(): Promise<string | null> {
  return process.env.OPENAI_API_KEY || null;
}
