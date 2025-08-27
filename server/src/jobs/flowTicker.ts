import { prisma } from '../prisma.js';
import { tickFlow } from '../services/flowEngine.js';

export async function runFlowTicker() {
  const now = new Date();
  const due = await prisma.flowState.findMany({
    where: {
      status: 'running',
      resumeAt: { lte: now }
    },
    take: 50
  });
  for (const st of due) {
    await prisma.flowState.update({ where: { id: st.id }, data: { resumeAt: null } });
    await tickFlow(st.id);
  }
}
