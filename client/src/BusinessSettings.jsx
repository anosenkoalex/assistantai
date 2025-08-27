import React, { useEffect, useState } from 'react';
import { getSettings, testKey, saveKey, listModels } from './api';

export default function BusinessSettings() {
  const [hasKey, setHasKey] = useState(false);
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setHasKey(!!s.hasKey);
        setModel(s.model || '');
      } catch {
        setStatus('Ошибка загрузки настроек');
      }
      try {
        const m = await listModels();
        const names = Array.isArray(m.data) ? m.data.map(x => x.id).filter(Boolean) : [];
        setModels(names);
      } catch {
        // если ключа нет/невалиден — список моделей может не прийти
      }
    })();
  }, []);

  const onTest = async (e) => {
    e.preventDefault();
    setStatus('Проверяем ключ…');
    const res = await testKey(apiKey || undefined);
    setStatus(res.valid ? 'Ключ валидный ✅' : `Ключ не прошёл проверку ❌: ${res.error || ''}`);
  };

  const onSave = async (e) => {
    e.preventDefault();
    setStatus('Сохраняем…');
    try {
      await saveKey({ apiKey: apiKey || undefined, model: model || undefined });
      setStatus('Сохранено ✅');
      setHasKey(true);
      setApiKey('');
    } catch {
      setStatus('Не удалось сохранить ❌');
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: 16 }}>
      <h2>Настройки OpenAI</h2>
      <p>Статус: {hasKey ? 'Ключ установлен' : 'Ключ не задан'}</p>
      <form onSubmit={onSave}>
        <div style={{ marginBottom: 12 }}>
          <label>API Key (не сохраняем пустую строку)</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            style={{ width: '100%', padding: 8 }}
          />
          <button onClick={onTest} style={{ marginTop: 8, marginRight: 8 }} type="button">Проверить ключ</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Модель по умолчанию</label>
          <select value={model} onChange={e => setModel(e.target.value)} style={{ width: '100%', padding: 8 }}>
            <option value="">(использовать DEFAULT_MODEL из .env)</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <button type="submit">Сохранить</button>
      </form>
      <div style={{ marginTop: 12, minHeight: 24 }}>{status}</div>
    </div>
  );
}
