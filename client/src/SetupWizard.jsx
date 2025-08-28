import React, { useState } from 'react';

export default function SetupWizard() {
  const [step, setStep] = useState(1);

  const [openai, setOpenai] = useState(localStorage.getItem('OPENAI_API_KEY') || '');
  const [pageToken, setPageToken] = useState(localStorage.getItem('PAGE_ACCESS_TOKEN') || '');
  const [tgToken, setTgToken] = useState(localStorage.getItem('TG_BOT_TOKEN') || '');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('ADMIN_TOKEN') || '');
  const [saveStatus, setSaveStatus] = useState('');

  const saveTokens = () => {
    localStorage.setItem('OPENAI_API_KEY', openai);
    localStorage.setItem('PAGE_ACCESS_TOKEN', pageToken);
    localStorage.setItem('TG_BOT_TOKEN', tgToken);
    localStorage.setItem('ADMIN_TOKEN', adminToken);
    setSaveStatus('Сохранено ✅');
  };

  const [health, setHealth] = useState(null);
  const [healthStatus, setHealthStatus] = useState('');
  const checkHealth = async () => {
    setHealthStatus('Проверяем…');
    try {
      const r = await fetch('/healthz');
      const j = await r.json();
      setHealth(j);
      setHealthStatus('');
    } catch {
      setHealthStatus('Ошибка запроса');
    }
  };

  const [userId, setUserId] = useState('');
  const [sendStatus, setSendStatus] = useState('');
  const sendTest = async () => {
    setSendStatus('Отправляем…');
    try {
      const r = await fetch('/api/admin/test/ig-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ userId, text: 'Привет от бота!' }),
      });
      setSendStatus(r.ok ? 'Отправлено ✅' : 'Ошибка ❌');
    } catch {
      setSendStatus('Ошибка ❌');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '20px auto', padding: 16 }}>
      {step === 1 && (
        <div>
          <h2>Шаг 1: Токены</h2>
          <div style={{ marginBottom: 8 }}>
            <label>OpenAI API Key</label>
            <input type="password" value={openai} onChange={e => setOpenai(e.target.value)} placeholder="sk-..." style={{ width:'100%', padding:8 }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>PAGE_ACCESS_TOKEN</label>
            <input type="password" value={pageToken} onChange={e => setPageToken(e.target.value)} placeholder="EA..." style={{ width:'100%', padding:8 }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>TG_BOT_TOKEN</label>
            <input type="password" value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="123456:ABC" style={{ width:'100%', padding:8 }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>ADMIN_TOKEN</label>
            <input type="password" value={adminToken} onChange={e => setAdminToken(e.target.value)} placeholder="длинный случайный" style={{ width:'100%', padding:8 }} />
          </div>
          <button onClick={saveTokens}>Сохранить</button>
          <div style={{ minHeight:24, marginTop:8 }}>{saveStatus}</div>
          <button onClick={()=>setStep(2)} style={{ marginTop:16 }}>Далее</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Шаг 2: Проверка</h2>
          <button onClick={checkHealth}>Проверить</button>
          <div style={{ minHeight:24, marginTop:8 }}>{healthStatus}</div>
          {health && (
            <pre style={{ background:'#f5f5f5', padding:8 }}>{JSON.stringify(health, null, 2)}</pre>
          )}
          <button onClick={()=>setStep(3)} style={{ marginTop:16 }}>Далее</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Шаг 3: Тест IG</h2>
          <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="IG userId" style={{ width:'100%', padding:8 }} />
          <button onClick={sendTest} style={{ marginTop:8 }}>Отправить привет</button>
          <div style={{ minHeight:24, marginTop:8 }}>{sendStatus}</div>
        </div>
      )}
    </div>
  );
}
