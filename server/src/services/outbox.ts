import { prisma } from '../prisma.js';

export async function enqueue(type: string, payload: any) {
  return prisma.outbox.create({ data: { type, payload } });
}
