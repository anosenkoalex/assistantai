import React, { useEffect, useState } from 'react';
import { igGetSettings, igSaveSettings } from './api';

export default function IgSettings() {
  const [tz, setTz] = useState('Asia/Bishkek');
  const [quietStart, setQuietStart] = useState('21:00');
  const [quietEnd, setQuietEnd] = useState('09:00');
  const [quick, setQuick] = useState('Цена,Доставка,Менеджер');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('Вы — полезный ассистент бренда. Отвечайте кратко и дружелюбно.');
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const s = await igGetSettings();
        setTz(s.tz || 'Asia/Bishkek');
        setQuietStart(s.quietStart || '21:00');
        setQuietEnd(s.quietEnd || '09:00');
        setQuick(s.quickReplies ? JSON.parse(s.quickReplies).join(',') : 'Цена,Доставка,Менеджер');
        setAiEnabled(!!s.aiEnabled);
        setAiModel(s.aiModel || 'gpt-4o-mini');
        setAiTemperature(typeof s.aiTemperature === 'number' ? s.aiTemperature : 0.7);
        setSystemPrompt(s.systemPrompt || 'Вы — полезный ассистент бренда. Отвечайте кратко и дружелюбно.');
      } catch {
        setStatus('Ошибка загрузки настроек IG');
      }
    })();
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setStatus('Сохраняю…');
    try {
      const arr = quick.split(',').map(s => s.trim()).filter(Boolean);
      await igSaveSettings({
        tz,
        quietStart,
        quietEnd,
        quickReplies: arr,
        aiEnabled,
        aiModel,
        aiTemperature: Number(aiTemperature),
        systemPrompt
      });
      setStatus('Сохранено ✅');
    } catch {
      setStatus('Не удалось сохранить ❌');
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '20px auto', padding: 12 }}>
      <h2>IG Settings</h2>
      <form onSubmit={onSave} style={{ display: 'grid', gap: 10 }}>
        <label>Time zone</label>
        <input value={tz} onChange={e => setTz(e.target.value)} placeholder="IANA tz" />

        <label>Quiet hours start (HH:mm)</label>
        <input value={quietStart} onChange={e => setQuietStart(e.target.value)} placeholder="21:00" />

        <label>Quiet hours end (HH:mm)</label>
        <input value={quietEnd} onChange={e => setQuietEnd(e.target.value)} placeholder="09:00" />

        <label>Quick replies (через запятую)</label>
        <input value={quick} onChange={e => setQuick(e.target.value)} placeholder="Цена,Доставка,Менеджер" />

        <h3 style={{ marginTop: 20 }}>AI</h3>

        <label>
          <input type="checkbox" checked={aiEnabled} onChange={e=>setAiEnabled(e.target.checked)} />
          Включить AI-ответы
        </label>

        <label>Модель</label>
        <input value={aiModel} onChange={e=>setAiModel(e.target.value)} placeholder="gpt-4o-mini" />

        <label>Температура (0..1)</label>
        <input type="number" step="0.1" min="0" max="1" value={aiTemperature} onChange={e=>setAiTemperature(e.target.value)} />

        <label>System Prompt</label>
        <textarea rows={5} value={systemPrompt} onChange={e=>setSystemPrompt(e.target.value)} />

        <button type="submit">Сохранить</button>
      </form>
      <div style={{ marginTop: 10, minHeight: 20 }}>{status}</div>
    </div>
  );
}
