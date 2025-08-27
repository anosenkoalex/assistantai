import React, { useEffect, useState } from 'react';
import { igRuleStats } from './api';

export default function IgRuleStats() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');

  async function load() {
    try {
      const data = await igRuleStats({ from, to });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setStatus('');
    } catch {
      setStatus('Ошибка загрузки статистики правил');
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', padding: 12 }}>
      <h2>IG Stats — Rule hits</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <label>From</label>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <label>To</label>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        <button onClick={load}>Обновить</button>
        <span style={{ marginLeft: 'auto' }}>Всего: {total}</span>
      </div>

      <div style={{ minHeight: 20, marginBottom: 6 }}>{status}</div>

      <table width="100%" border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Правило</th>
            <th>Ключевое слово</th>
            <th>Срабатываний</th>
          </tr>
        </thead>
        <tbody>
          {items.map((x, i) => (
            <tr key={i}>
              <td>{x.ruleId}</td>
              <td>{x.keyword}</td>
              <td>{x.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
