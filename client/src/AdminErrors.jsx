import React, { useEffect, useState } from 'react';
import { adminErrors, adminErrorsClear } from './api';

export default function AdminErrors() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const d = await adminErrors({ source });
    setItems(d.items||[]); setTotal(d.total||0);
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [source]);

  return (
    <div style={{ maxWidth: 900, margin:'20px auto', padding:12 }}>
      <h2>Integration Errors ({total})</h2>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
        <label>Source</label>
        <select value={source} onChange={e=>setSource(e.target.value)}>
          <option value="">(all)</option>
          <option>IG_GRAPH</option>
          <option>OPENAI</option>
          <option>TELEGRAM</option>
          <option>SCHEDULER</option>
        </select>
        <button onClick={load}>Refresh</button>
        <button onClick={async ()=>{ await adminErrorsClear(); setMsg('Cleared'); load(); }}>Clear all</button>
        <span style={{ marginLeft:'auto' }}>{msg}</span>
      </div>
      <table width="100%" border="1" cellPadding="6" style={{ borderCollapse:'collapse' }}>
        <thead>
          <tr><th>Time</th><th>Source</th><th>Code</th><th>Message</th><th>Meta</th></tr>
        </thead>
        <tbody>
          {items.map(e=>(
            <tr key={e.id}>
              <td>{new Date(e.createdAt).toLocaleString()}</td>
              <td>{e.source}</td>
              <td>{e.code}</td>
              <td style={{ whiteSpace:'pre-wrap' }}>{e.message}</td>
              <td><pre style={{ whiteSpace:'pre-wrap', margin:0 }}>{JSON.stringify(e.meta, null, 2).slice(0, 800)}</pre></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
