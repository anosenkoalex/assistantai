import { prisma } from '../prisma.js';
import { getApiKeyFromDB } from '../routes/settings.js';

type ChatMsg = { role: 'system'|'user'|'assistant'; content: string };

export async function buildThreadMessages(threadId: string, userText: string, systemPrompt?: string, limit = 12): Promise<ChatMsg[]> {
  // Берём последние N событий этого треда, переводим в формат Chat
  const events = await prisma.igEvent.findMany({
    where: { threadId },
    orderBy: { at: 'desc' },
    take: limit
  });
  const history = events.reverse().map(e => {
    if (!e.text) return null;
    return {
      role: e.direction === 'in' ? 'user' : 'assistant',
      content: e.text
    } as ChatMsg;
  }).filter(Boolean) as ChatMsg[];

  const msgs: ChatMsg[] = [];
  if (systemPrompt && systemPrompt.trim()) {
    msgs.push({ role: 'system', content: systemPrompt.trim() });
  }
  msgs.push(...history);
  msgs.push({ role: 'user', content: userText });
  return msgs;
}

export async function askOpenAI(messages: ChatMsg[], model: string, temperature = 0.7): Promise<{ text: string; usage?: { prompt_tokens: number; completion_tokens: number } }> {
  const apiKey = await getApiKeyFromDB();
  if (!apiKey) throw new Error('OpenAI API key not set');

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages, temperature })
  });

  if (!r.ok) {
    const t = await r.text().catch(()=> '');
    throw new Error(`OpenAI HTTP ${r.status}: ${t}`);
  }
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content?.trim?.() || '';
  const usage = data.usage ? { prompt_tokens: data.usage.prompt_tokens, completion_tokens: data.usage.completion_tokens } : undefined;
  return { text, usage };
}
