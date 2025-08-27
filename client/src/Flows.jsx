import React, { useEffect, useState } from 'react';
import { flowsList, flowsCreate, flowsUpdate, flowTriggers, flowTriggerCreate, flowTriggerToggle } from './api';

export default function Flows() {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [name, setName] = useState('');
  const [entry, setEntry] = useState('start');
  const [nodes, setNodes] = useState('{\n  "start": { "type":"sendText", "text":"Привет!", "next":"q1" },\n  "q1": { "type":"sendQuick", "text":"Чем помочь?", "quick":["Цена","Доставка","Менеджер"] }\n}');
  const [trigs, setTrigs] = useState([]);
  const [tVal, setTVal] = useState('');

  async function load() {
    const list = await flowsList();
    setItems(list);
  }
  useEffect(() => { load(); }, []);

  async function pick(f) {
    setSel(f);
    setName(f.name);
    setEntry(f.entry);
    setNodes(JSON.stringify(f.nodes, null, 2));
    setTrigs((await flowTriggers(f.id)) || []);
  }

  async function create() {
    const created = await flowsCreate({ name: name || 'Flow', entry, nodes: JSON.parse(nodes) });
    await load(); setSel(created); pick(created);
  }

  async function save() {
    if (!sel) return;
    await flowsUpdate(sel.id, { name, entry, nodes: JSON.parse(nodes), active: true });
    await load();
  }

  async function addTrig() {
    if (!sel || !tVal) return;
    await flowTriggerCreate(sel.id, { kind: 'keyword', value: tVal });
    setTVal('');
    setTrigs(await flowTriggers(sel.id));
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, padding: 12 }}>
      <div>
        <h3>Flows</h3>
        <div style={{ maxHeight: '70vh', overflow: 'auto', border: '1px solid #ddd' }}>
          {items.map(f => (
            <div key={f.id} onClick={() => pick(f)} style={{ padding: 8, borderBottom: '1px solid #eee', cursor: 'pointer' }}>
              <b>{f.name}</b> • {f.active ? 'active' : 'off'}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={create}>+ Новый Flow</button>
        </div>
      </div>

      <div>
        <h3>{sel ? `Редактирование: ${sel.name}` : 'Создать flow'}</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название" />
          <input value={entry} onChange={e => setEntry(e.target.value)} placeholder="ID стартового шага, напр. start" />
          <textarea rows={20} value={nodes} onChange={e => setNodes(e.target.value)} style={{ width: '100%', fontFamily: 'monospace' }} />
          <button onClick={save} disabled={!sel}>Сохранить</button>
        </div>

        {sel && (
          <div style={{ marginTop: 16 }}>
            <h4>Триггеры</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={tVal} onChange={e => setTVal(e.target.value)} placeholder="Ключевое слово" />
              <button onClick={addTrig}>Добавить</button>
            </div>
            <div>
              {trigs.map(t => (
                <div key={t.id} style={{ padding: '6px 0', borderBottom: '1px dashed #eee' }}>
                  keyword: <b>{t.value}</b> • {t.active ? 'on' : 'off'}{' '}
                  <button onClick={() => flowTriggerToggle(t.id).then(() => flowTriggers(sel.id).then(setTrigs))}>
                    toggle
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
