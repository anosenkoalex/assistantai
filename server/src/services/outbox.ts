import { prisma } from '../prisma.js';
import { jstr } from '../utils/json.js';

export async function enqueue(type: string, payload: any) {
  return prisma.outbox.create({ data: { type, payload: jstr(payload) ?? '{}' } });
}
