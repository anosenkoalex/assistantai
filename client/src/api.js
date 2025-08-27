export async function getSettings() {
  const r = await fetch('/api/settings/openai');
  if (!r.ok) throw new Error('Settings fetch failed');
  return r.json();
}

export async function testKey(apiKey) {
  const r = await fetch('/api/settings/test-key', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ apiKey })
  });
  return r.json(); // {valid, error?}
}

export async function saveKey({ apiKey, model }) {
  const r = await fetch('/api/settings/openai', {
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ apiKey, model })
  });
  if (!r.ok) throw new Error('Save key failed');
  return r.json();
}

export async function listModels() {
  const r = await fetch('/api/models');
  if (!r.ok) throw new Error('Models fetch failed');
  return r.json();
}

export async function getUsage(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`/api/usage${q ? `?${q}` : ''}`);
  if (!r.ok) throw new Error('Usage fetch failed');
  return r.json();
}

/** Поток чата через fetch-стрим (формат SSE-подобный).
 * onDelta(textChunk), onDone(), onError(err)
 */
export async function streamChat({ messages, model, temperature, system }, { onDelta, onDone, onError }) {
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ messages, model, temperature, system })
    });
    if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Сервер шлёт строки вида:  data: {...}\n\n
      let idx;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const packet = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        if (!packet.startsWith('data:')) continue;
        const jsonStr = packet.slice(5).trim();
        try {
          const evt = JSON.parse(jsonStr);
          if (evt.delta) onDelta?.(evt.delta);
          if (evt.done) onDone?.();
          if (evt.error) onError?.(new Error(evt.error));
        } catch { /* ignore */ }
      }
    }
    onDone?.();
  } catch (err) {
    onError?.(err);
  }
}

