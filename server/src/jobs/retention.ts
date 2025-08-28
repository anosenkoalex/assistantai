import { prisma } from '../prisma.js';
export async function runRetention() {
  const days = Number(process.env.RETENTION_DAYS||180);
  const dt = new Date(Date.now()-days*24*3600e3);
  await prisma.integrationError.deleteMany({ where:{ createdAt: { lt: dt } }});
  await prisma.igEvent.deleteMany({ where:{ at: { lt: dt } }});
}
