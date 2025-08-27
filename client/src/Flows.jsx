import React, { useEffect, useState } from 'react';
import { flowsList, flowsCreate, flowsUpdate, flowTriggers, flowTriggerCreate, flowTriggerToggle, flowExport, flowImport, flowTriggerUpdate, flowRunBatch } from './api';
import FlowGraph from './FlowGraph';

// Predefined flow templates
const PRESETS = [
  {
    label: 'E-commerce: Быстрый квиз',
    flow: {
      name: 'Ecom Quick Quiz',
      entry: 'start',
      nodes: {
        start: { type:'sendText', text:'Привет! Помогу подобрать товар 👍', next:'q1' },
        q1:    { type:'sendQuick', text:'Что важнее?', quick:['Цена','Качество','Сроки'], next:'q2' },
        q2:    { type:'sendQuick', text:'Куда доставлять?', quick:['По городу','По стране','Международно'], next:'handoff' },
        handoff: { type:'handoff' }
      }
    },
    triggers: [{ kind:'keyword', value:'купить' }]
  },
  {
    label: 'Beauty: Запись на услугу',
    flow: {
      name: 'Beauty Lead',
      entry: 'start',
      nodes: {
        start: { type:'sendText', text:'Здравствуйте! Помогу с записью 💅', next:'q1' },
        q1:    { type:'sendQuick', text:'Какая услуга интересует?', quick:['Маникюр','Педикюр','Комплект'], next:'q2' },
        q2:    { type:'sendQuick', text:'Когда удобно?', quick:['Сегодня','Завтра','На неделе'], next:'handoff' },
        handoff: { type:'handoff' }
      }
    },
    triggers: [{ kind:'keyword', value:'запись' }]
  },
  {
    label: 'Restaurant: Бронирование',
    flow: {
      name: 'Restaurant Booking',
      entry: 'start',
      nodes: {
        start: { type:'sendText', text:'Здравствуйте! Помогу забронировать столик 🍽️', next:'q1' },
        q1:    { type:'sendQuick', text:'На сколько персон?', quick:['2','4','6+'], next:'q2' },
        q2:    { type:'sendQuick', text:'Когда?', quick:['Сегодня','Завтра','На выходных'], next:'handoff' },
        handoff: { type:'handoff' }
      }
    },
    triggers: [{ kind:'keyword', value:'бронь' }]
  }
];

export default function Flows() {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [name, setName] = useState('');
  const [entry, setEntry] = useState('start');
  const [nodes, setNodes] = useState('{\n  "start": { "type":"sendText", "text":"Привет!", "next":"q1" },\n  "q1": { "type":"sendQuick", "text":"Чем помочь?", "quick":["Цена","Доставка","Менеджер"] }\n}');
  const [trigs, setTrigs] = useState([]);
  const [tVal, setTVal] = useState('');
  const [tKind, setTKind] = useState('keyword');
  const [tStart, setTStart] = useState('');
  const [tEnd, setTEnd] = useState('');
  const [tDaysMask, setTDaysMask] = useState('');
  const [preset, setPreset] = useState(PRESETS[0]);
  const [segStatus, setSegStatus] = useState('');
  const [segSince, setSegSince] = useState('');
  const [segLimit, setSegLimit] = useState(200);
  const [batchMsg, setBatchMsg] = useState('');

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
    if (!sel) return;
    await flowTriggerCreate(sel.id, {
      kind: tKind, value: tVal,
      startAt: tStart || undefined,
      endAt: tEnd || undefined,
      daysMask: tDaysMask ? Number(tDaysMask) : undefined
    });
    setTVal(''); setTKind('keyword'); setTStart(''); setTEnd(''); setTDaysMask('');
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
        <div style={{ marginTop: 12, display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={create}>+ Новый Flow</button>
          <button onClick={async ()=>{
            const p = preset;
            const created = await flowsCreate({ name: p.flow.name, entry: p.flow.entry, nodes: p.flow.nodes });
            for (const t of p.triggers) {
              await flowTriggerCreate(created.id, t);
            }
            await load(); setSel(created); pick(created);
          }}>Create from preset</button>
          <select value={preset.label} onChange={e=> setPreset(PRESETS.find(x=>x.label===e.target.value))}>
            {PRESETS.map(p=><option key={p.label}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <h3>{sel ? `Редактирование: ${sel.name}` : 'Создать flow'}</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название" />
          <input value={entry} onChange={e => setEntry(e.target.value)} placeholder="ID стартового шага, напр. start" />
          <FlowGraph value={sel ? sel.nodes : JSON.parse(nodes || '{}')}
                     onChange={(v)=> setNodes(JSON.stringify(v, null, 2))} />
          <textarea rows={20} value={nodes} onChange={e => setNodes(e.target.value)} style={{ width: '100%', fontFamily: 'monospace' }} />
          <button onClick={save} disabled={!sel}>Сохранить</button>
        </div>

        <div style={{ marginTop:8 }}>
          <button onClick={async ()=>{
            if (!sel) return;
            const data = await flowExport(sel.id);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${sel.name.replace(/\s+/g,'_')}.flow.json`;
            a.click(); URL.revokeObjectURL(url);
          }}>Export</button>

          <label style={{ marginLeft: 8 }}>
            Import (.flow.json)
            <input type="file" accept="application/json" onChange={async (e)=>{
              const file = e.target.files?.[0]; if(!file) return;
              const txt = await file.text();
              await flowImport(JSON.parse(txt));
              load();
            }} />
          </label>
        </div>

        {sel && (
          <div style={{ marginTop: 16 }}>
            <h4>Триггеры</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap:'wrap' }}>
              <select value={tKind} onChange={e=>setTKind(e.target.value)}>
                <option>keyword</option>
                <option>quick</option>
                <option>referral</option>
                <option>story_mention</option>
                <option>any</option>
              </select>
              <input value={tVal} onChange={e=>setTVal(e.target.value)} placeholder="value (для keyword/quick/referral)" />
              <input type="datetime-local" value={tStart} onChange={e=>setTStart(e.target.value)} />
              <input type="datetime-local" value={tEnd} onChange={e=>setTEnd(e.target.value)} />
              <input value={tDaysMask} onChange={e=>setTDaysMask(e.target.value)} placeholder="daysMask (напр. 127)" />
              <button onClick={addTrig}>Добавить</button>
            </div>
            <div>
              {trigs.map(t => (
                <div key={t.id} style={{ padding: '6px 0', borderBottom: '1px dashed #eee' }}>
                  {t.kind}: <b>{t.value}</b> • {t.active ? 'on' : 'off'}{' '}
                  <button onClick={() => {
                    const val = prompt('value', t.value);
                    if (val != null) flowTriggerUpdate(t.id, { value: val }).then(() => flowTriggers(sel.id).then(setTrigs));
                  }}>edit</button>{' '}
                  <button onClick={() => flowTriggerToggle(t.id).then(() => flowTriggers(sel.id).then(setTrigs))}>
                    toggle
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {sel && (
          <div style={{ marginTop:16, paddingTop:12, borderTop:'1px dashed #ccc' }}>
            <h4>Batch run (рассылка по сегменту)</h4>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <label>Status</label>
              <select value={segStatus} onChange={e=>setSegStatus(e.target.value)}>
                <option value="">(любой)</option>
                <option value="bot">bot</option>
                <option value="manager">manager</option>
                <option value="muted">muted</option>
              </select>
              <label>activeSince</label>
              <input type="datetime-local" value={segSince} onChange={e=>setSegSince(e.target.value)} />
              <label>limit</label>
              <input type="number" min="1" value={segLimit} onChange={e=>setSegLimit(e.target.value)} style={{ width:90 }} />
              <button onClick={async ()=>{
                const res = await flowRunBatch(sel.id, {
                  status: segStatus || undefined,
                  activeSince: segSince || undefined,
                  limit: Number(segLimit)||200
                });
                setBatchMsg(`Запущено: ${res.started} из ${res.total}`);
              }}>Run</button>
              <span>{batchMsg}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
