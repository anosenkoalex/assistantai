import { prisma } from '../prisma.js';
import { enqueue } from './outbox.js';

// Типы узлов:
// sendText { type:'sendText', text, next? }
// sendQuick { type:'sendQuick', text, quick: string[], next? }
// handoff   { type:'handoff' } -> статус manager
// setStatus { type:'setStatus', value: 'bot'|'manager'|'muted', next? }
// wait      { type:'wait', waitSec: number, next? }

export async function startFlow({ contactId, threadId, flowId }: { contactId: string; threadId: string; flowId: string }) {
  const flow = await prisma.flow.findUnique({ where: { id: flowId } });
  if (!flow) throw new Error('flow not found');
  return prisma.flowState.create({
    data: { contactId, threadId, flowId, nodeId: flow.entry, status: 'running' }
  });
}

export async function tickFlow(stateId: string) {
  const state = await prisma.flowState.findUnique({ where: { id: stateId } });
  if (!state || state.status !== 'running') return;
  const flow = await prisma.flow.findUnique({ where: { id: state.flowId } });
  if (!flow) return;

  const nodes = flow.nodes as any;
  const node = nodes[state.nodeId];
  if (!node) {
    await prisma.flowState.update({ where: { id: state.id }, data: { status: 'done' }});
    return;
  }

  const contact = await prisma.igContact.findUnique({ where: { id: state.contactId } });
  if (!contact) return;

  // действия по типам:
  if (node.type === 'sendText') {
    await sendIG(contact.igUserId, state.threadId, node.text, undefined);
    await gotoNext(state, node.next);
    return;
  }

  if (node.type === 'sendQuick') {
    await sendIG(contact.igUserId, state.threadId, node.text, node.quick || []);
    await gotoNext(state, node.next);
    return;
  }

  if (node.type === 'handoff') {
    await prisma.igContact.update({ where: { id: contact.id }, data: { status: 'manager' } });
    await prisma.flowState.update({ where: { id: state.id }, data: { status: 'done' }});
    return;
  }

  if (node.type === 'setStatus') {
    if (node.value) await prisma.igContact.update({ where: { id: contact.id }, data: { status: node.value } });
    await gotoNext(state, node.next);
    return;
  }

  if (node.type === 'wait') {
    const sec = Number(node.waitSec || 0);
    const resumeAt = new Date(Date.now() + Math.max(0, sec) * 1000);
    await prisma.flowState.update({ where: { id: state.id }, data: { resumeAt } });
    return; // будет тикнут позже
  }

  // дефолт: завершить
  await prisma.flowState.update({ where: { id: state.id }, data: { status: 'done' }});
}

async function gotoNext(state: any, next?: string) {
  if (next) {
    await prisma.flowState.update({ where: { id: state.id }, data: { nodeId: next } });
    await tickFlow(state.id); // синхронно продолжаем (пока без wait)
  } else {
    await prisma.flowState.update({ where: { id: state.id }, data: { status: 'done' }});
  }
}

async function sendIG(userId: string, threadId: string, text: string, quick?: string[]) {
  await enqueue('IG', { userPSID: userId, text, quickReplies: quick, threadId });
}
