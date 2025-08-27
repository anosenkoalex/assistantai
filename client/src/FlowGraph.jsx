import React, { useEffect, useRef, useState } from 'react';

export default function FlowGraph({ value, onChange }) {
  const [nodes, setNodes] = useState({});
  const canvasRef = useRef(null);

  useEffect(() => {
    // value — объект nodes; дополним координаты
    const n = JSON.parse(JSON.stringify(value || {}));
    Object.keys(n).forEach(id => {
      n[id]._x = n[id]._x ?? 80 + Math.random() * 400;
      n[id]._y = n[id]._y ?? 80 + Math.random() * 250;
    });
    setNodes(n);
  }, [value]);

  function save() {
    const clean = JSON.parse(JSON.stringify(nodes));
    Object.keys(clean).forEach(id => { delete clean[id]._x; delete clean[id]._y; });
    onChange?.(clean);
  }

  function addNode() {
    const id = prompt('ID узла (a-z0-9_)');
    if (!id || nodes[id]) return;
    const type = prompt('type: sendText|sendQuick|handoff|setStatus|wait') || 'sendText';
    const next = prompt('next (optional)') || undefined;
    const text = (type === 'sendText' || type === 'sendQuick') ? (prompt('text') || '') : undefined;
    const quick = (type === 'sendQuick') ? (prompt('quick (comma)') || '').split(',').map(s=>s.trim()).filter(Boolean) : undefined;
    const value = (type === 'setStatus') ? (prompt('status: bot|manager|muted') || 'bot') : undefined;
    const waitSec = (type === 'wait') ? Number(prompt('wait sec') || 0) : undefined;
    const copy = { ...nodes, [id]: { type, text, quick, next, value, waitSec, _x: 120, _y: 120 } };
    setNodes(copy); saveSoon();
  }

  let saveTimer = null;
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  }

  function onDrag(id, e) {
    const startX = e.clientX, startY = e.clientY;
    const origX = nodes[id]._x, origY = nodes[id]._y;
    function move(ev) {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      setNodes(prev => ({ ...prev, [id]: { ...prev[id], _x: origX + dx, _y: origY + dy } }));
    }
    function up() {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      saveSoon();
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function edit(id) {
    const n = nodes[id]; if (!n) return;
    const type = prompt('type', n.type) || n.type;
    const text = (type === 'sendText' || type === 'sendQuick') ? prompt('text', n.text || '') : n.text;
    const quick = (type === 'sendQuick') ? (prompt('quick (comma)', (n.quick || []).join(',')) || '').split(',').map(s=>s.trim()).filter(Boolean) : n.quick;
    const next = prompt('next', n.next || '') || undefined;
    const value = (type === 'setStatus') ? (prompt('status: bot|manager|muted', n.value || 'bot') || 'bot') : n.value;
    const waitSec = (type === 'wait') ? Number(prompt('wait sec', n.waitSec ?? 0) || 0) : n.waitSec;
    setNodes(prev => ({ ...prev, [id]: { ...prev[id], type, text, quick, next, value, waitSec } }));
    saveSoon();
  }

  function del(id) {
    const c = { ...nodes }; delete c[id];
    // зачистим ссылки next у других
    Object.keys(c).forEach(k => { if (c[k].next === id) c[k].next = undefined; });
    setNodes(c); saveSoon();
  }

  const ids = Object.keys(nodes);

  // отрисовка связей (линии) — простые div
  const edges = [];
  ids.forEach(id => {
    const n = nodes[id]; if (!n?.next || !nodes[n.next]) return;
    const a = n, b = nodes[n.next];
    const x1 = a._x, y1 = a._y, x2 = b._x, y2 = b._y;
    const left = Math.min(x1, x2), top = Math.min(y1, y2);
    const w = Math.abs(x1 - x2), h = Math.abs(y1 - y2);
    edges.push(<svg key={`e-${id}`} style={{ position:'absolute', left, top, width:w, height:h, pointerEvents:'none' }}>
      <line x1={x1-left} y1={y1-top} x2={x2-left} y2={y2-top} stroke="#999" strokeWidth="2" />
    </svg>);
  });

  return (
    <div style={{ border:'1px solid #ddd', height: 500, position:'relative', overflow:'hidden', background:'#fafafa' }} ref={canvasRef}>
      <div style={{ position:'absolute', right:10, top:10, display:'flex', gap:8 }}>
        <button onClick={addNode}>+ Node</button>
        <button onClick={save}>Save</button>
      </div>
      {edges}
      {ids.map(id => {
        const n = nodes[id];
        return (
          <div key={id}
               onMouseDown={(e)=>onDrag(id, e)}
               onDoubleClick={()=>edit(id)}
               style={{
                 position:'absolute', left:n._x, top:n._y,
                 transform:'translate(-50%,-50%)',
                 background:'#fff', border:'1px solid #ccc', borderRadius:8, padding:8, width:200, cursor:'move', boxShadow:'0 1px 4px rgba(0,0,0,0.1)'
               }}>
            <div style={{ fontWeight:700 }}>{id}</div>
            <div style={{ fontSize:12, opacity:0.8 }}>{n.type}</div>
            {n.text && <div style={{ fontSize:12, marginTop:4, whiteSpace:'pre-wrap' }}>{n.text.slice(0,80)}</div>}
            {Array.isArray(n.quick) && n.quick.length > 0 && <div style={{ fontSize:12, marginTop:4 }}>Quick: {n.quick.join(', ')}</div>}
            {n.next && <div style={{ fontSize:12, marginTop:4 }}>next ➜ {n.next}</div>}
            <div style={{ display:'flex', gap:6, marginTop:6 }}>
              <button onClick={(e)=>{e.stopPropagation(); edit(id);}}>Edit</button>
              <button onClick={(e)=>{e.stopPropagation(); del(id);}}>Del</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
