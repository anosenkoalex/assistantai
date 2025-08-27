function authHeaders() {
  const t = localStorage.getItem('ADMIN_TOKEN') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

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

// IG Admin
export async function igListContacts(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`/api/ig/contacts${q ? `?${q}` : ''}`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('contacts fetch failed');
  return r.json();
}
export async function igListThreads(contactId) {
  const r = await fetch(`/api/ig/threads?contactId=${encodeURIComponent(contactId)}`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('threads fetch failed');
  return r.json();
}
export async function igListEvents(threadId, params = {}) {
  const q = new URLSearchParams({ ...params, threadId }).toString();
  const r = await fetch(`/api/ig/events?${q}`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('events fetch failed');
  return r.json();
}
export async function igSetContactStatus(id, status) {
  const r = await fetch(`/api/ig/contacts/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type':'application/json', ...authHeaders() },
    body: JSON.stringify({ status })
  });
  if (!r.ok) throw new Error('set status failed');
  return r.json();
}

// IG Rules (уже есть базовые)
export async function igGetRules() {
  const r = await fetch('/api/ig/rules', { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('rules fetch failed');
  return r.json();
}
export async function igCreateRule({ keyword, reply }) {
  const r = await fetch('/api/ig/rules', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', ...authHeaders() },
    body: JSON.stringify({ keyword, reply })
  });
  if (!r.ok) throw new Error('rule create failed');
  return r.json();
}
export async function igToggleRule(id) {
  const r = await fetch(`/api/ig/rules/${id}/toggle`, { method: 'PUT', headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('rule toggle failed');
  return r.json();
}

// IG Settings
export async function igGetSettings() {
  const r = await fetch('/api/ig/settings', { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('ig settings fetch failed');
  return r.json();
}
export async function igSaveSettings({ tz, quietStart, quietEnd, quickReplies, aiEnabled, aiModel, aiTemperature, systemPrompt }) {
  const r = await fetch('/api/ig/settings', {
    method: 'PUT',
    headers: { 'Content-Type':'application/json', ...authHeaders() },
    body: JSON.stringify({ tz, quietStart, quietEnd, quickReplies, aiEnabled, aiModel, aiTemperature, systemPrompt })
  });
  if (!r.ok) throw new Error('ig settings save failed');
  return r.json();
}

// IG Stats
export async function igQuickStats(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`/api/ig/stats/quick${q ? `?${q}` : ''}`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('quick stats fetch failed');
  return r.json();
}

export async function igAdminSend({ contactId, text, quick }) {
  const r = await fetch('/api/ig/send', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', ...authHeaders() },
    body: JSON.stringify({ contactId, text, quick })
  });
  if (!r.ok) throw new Error('send failed');
  return r.json();
}

export async function igRuleStats(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`/api/ig/stats/rules${q ? `?${q}` : ''}`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('rule stats fetch failed');
  return r.json();
}

// Flows CRUD
export async function flowsList() {
  const r = await fetch('/api/flows', { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('flows fetch failed');
  return r.json();
}
export async function flowsCreate({ name, entry, nodes }) {
  const r = await fetch('/api/flows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name, entry, nodes })
  });
  if (!r.ok) throw new Error('flow create failed');
  return r.json();
}
export async function flowsUpdate(id, { name, entry, nodes, active }) {
  const r = await fetch(`/api/flows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name, entry, nodes, active })
  });
  if (!r.ok) throw new Error('flow update failed');
  return r.json();
}
export async function flowTriggers(flowId) {
  const r = await fetch(`/api/flows/${flowId}/triggers`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('flow triggers failed');
  return r.json();
}
export async function flowTriggerCreate(flowId, { kind, value }) {
  const r = await fetch(`/api/flows/${flowId}/triggers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ kind, value })
  });
  if (!r.ok) throw new Error('flow trigger create failed');
  return r.json();
}
export async function flowTriggerToggle(id) {
  const r = await fetch(`/api/flow-triggers/${id}/toggle`, { method: 'PUT', headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('flow trigger toggle failed');
  return r.json();
}

export async function flowExport(id) {
  const r = await fetch(`/api/flows/${id}/export`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error('flow export failed');
  return r.json();
}
export async function flowImport(payload) {
  const r = await fetch('/api/flows/import', {
    method:'POST',
    headers: { 'Content-Type':'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('flow import failed');
  return r.json();
}
export async function flowTriggerUpdate(id, data) {
  const r = await fetch(`/api/flow-triggers/${id}`, {
    method:'PUT',
    headers: { 'Content-Type':'application/json', ...authHeaders() },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error('flow trigger update failed');
  return r.json();
}

export async function flowRunBatch(id, body) {
  const r = await fetch(`/api/flows/${id}/run`, {
    method:'POST',
    headers: { 'Content-Type':'application/json', ...authHeaders() },
    body: JSON.stringify(body || {})
  });
  if (!r.ok) throw new Error('flow run batch failed');
  return r.json();
}

