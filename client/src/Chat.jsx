import React, { useState, useRef } from 'react';
import { streamChat } from './api';

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Привет! Введи вопрос.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, msg, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    const base = messages.concat(msg).filter(Boolean);
    let acc = '';

    await streamChat(
      { messages: base, model: undefined, temperature: 0.7, system: undefined },
      {
        onDelta: (chunk) => {
          acc += chunk;
          setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: 'assistant', content: acc };
            return copy;
          });
          scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
        },
        onDone: () => setLoading(false),
        onError: (e) => {
          setLoading(false);
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `Ошибка: ${e.message || e}` }
          ]);
        }
      }
    );
  };

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', display: 'flex', flexDirection: 'column', height: '80vh' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            margin: '8px 0', padding: 8, borderRadius: 6,
            background: m.role === 'user' ? '#eef' : '#f6f6f6'
          }}>
            <b>{m.role === 'user' ? 'Вы' : 'Ассистент'}:</b> {m.content}
          </div>
        ))}
        {loading && <div style={{ opacity: 0.6 }}>Генерация…</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Спросите что-нибудь…"
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={send} disabled={loading}>Отправить</button>
      </div>
    </div>
  );
}

