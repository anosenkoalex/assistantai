import { prisma } from '../prisma.js';

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
    await sendIG(contact.igUserId, node.text, undefined);
    await log(state.threadId, 'out', 'text', node.text);
    await gotoNext(state, node.next);
    return;
  }

  if (node.type === 'sendQuick') {
    await sendIG(contact.igUserId, node.text, node.quick || []);
    await log(state.threadId, 'out', 'text', node.text);
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

async function sendIG(userId: string, text: string, quick?: string[]) {
  // используем ту же отправку, что и в ig.ts
  const token = process.env.PAGE_ACCESS_TOKEN || '';
  const payload: any = { recipient: { id: userId }, message: { text } };
  if (Array.isArray(quick) && quick.length) {
    payload.message.quick_replies = quick.slice(0, 11).map(t => ({ content_type:'text', title:String(t).slice(0,20), payload: `QR:${t}` }));
  }
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(token)}`;
  await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
}

async function log(threadId: string, direction: 'in'|'out', type: string, text?: string) {
  await prisma.igEvent.create({ data: { threadId, direction, type, text } });
}
