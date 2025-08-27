import React, { useEffect, useState } from 'react';
import { igGetRules, igCreateRule, igToggleRule } from './api';

export default function IgRules() {
  const [rules, setRules] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('');

  async function load() {
    try {
      const list = await igGetRules();
      setRules(list);
    } catch {
      setStatus('Ошибка загрузки правил');
    }
  }

  useEffect(() => { load(); }, []);

  async function onCreate(e) {
    e.preventDefault();
    setStatus('Сохраняю…');
    try {
      await igCreateRule({ keyword, reply });
      setKeyword(''); setReply(''); setStatus('Добавлено');
      load();
    } catch {
      setStatus('Не удалось сохранить');
    }
  }

  async function onToggle(id) {
    setStatus('Отключаю…');
    try {
      await igToggleRule(id);
      setStatus('Готово');
      load();
    } catch {
      setStatus('Ошибка выключения');
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', padding: 12 }}>
      <h2>Правила IG (ключевые слова → ответ)</h2>

      <form onSubmit={onCreate} style={{ margin: '12px 0', display: 'grid', gap: 8 }}>
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Ключевое слово" required />
        <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Ответ" rows={3} required />
        <button type="submit">Добавить правило</button>
      </form>

      <div style={{ margin: '8px 0', minHeight: 20 }}>{status}</div>

      <table width="100%" border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Ключевое слово</th>
            <th>Ответ</th>
            <th>Активно</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id}>
              <td>{r.keyword}</td>
              <td style={{ whiteSpace: 'pre-wrap' }}>{r.reply}</td>
              <td>{String(r.active)}</td>
              <td><button onClick={() => onToggle(r.id)}>Выключить</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

