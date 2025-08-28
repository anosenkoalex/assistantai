import React, { useState } from 'react';
import { adminTestIgSend } from './api.js';

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
  const [healthOk, setHealthOk] = useState(null);
  const checkHealth = async () => {
    setHealthStatus('Проверяем…');
    try {
      const r = await fetch('/healthz');
      const j = await r.json();
      setHealth(j);
      setHealthOk(true);
      setHealthStatus('');
    } catch {
      setHealthOk(false);
      setHealthStatus('Ошибка запроса');
    }
  };

  const [userId, setUserId] = useState('');
  const [text, setText] = useState('Привет от бота!');
  const [quick, setQuick] = useState('');
  const [msg, setMsg] = useState('');
  const sendTest = async () => {
    try {
      const quickArr = quick.split(',').map(s=>s.trim()).filter(Boolean);
      await adminTestIgSend({ userId, text, quick: quickArr });
      setMsg('Отправлено ✅');
    } catch {
      setMsg('Ошибка ❌');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '20px auto', padding: 16 }}>
      <div style={{ textAlign:'right', marginBottom:8 }}>
        <button onClick={checkHealth}>Проверить</button>
        <span style={{ marginLeft:8, color: healthOk==null?'#999':healthOk?'green':'red' }}>●</span>
      </div>

      {step === 1 && (
        <div>
          <h2>Шаг 1: Токены</h2>
          <div style={{ marginBottom: 8 }}>
            <label>OpenAI API Key</label>
            <input type="password" value={openai} onChange={e => setOpenai(e.target.value)} placeholder="sk-..." style={{ width:'100%', padding:8 }} />
            <div style={{ fontSize:12, color:'#666' }}>Ключ OpenAI, получить на platform.openai.com</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>PAGE_ACCESS_TOKEN</label>
            <input type="password" value={pageToken} onChange={e => setPageToken(e.target.value)} placeholder="EA..." style={{ width:'100%', padding:8 }} />
            <div style={{ fontSize:12, color:'#666' }}>Токен страницы Instagram/Facebook в Meta Developers</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>TG_BOT_TOKEN</label>
            <input type="password" value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="123456:ABC" style={{ width:'100%', padding:8 }} />
            <div style={{ fontSize:12, color:'#666' }}>Токен бота Telegram от @BotFather</div>
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
          <div style={{ minHeight:24, marginTop:8 }}>{healthStatus}</div>
          {health && (
            <pre style={{ background:'#f5f5f5', padding:8 }}>{JSON.stringify(health, null, 2)}</pre>
          )}
          <button onClick={()=>setStep(3)} style={{ marginTop:16 }}>Далее</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Шаг 3: Тест-сообщение</h2>
          <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="IG userId" style={{ width:'100%', padding:8 }} />
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Текст" style={{ width:'100%', padding:8, marginTop:8 }} />
          <input value={quick} onChange={e => setQuick(e.target.value)} placeholder="Quick через запятую" style={{ width:'100%', padding:8, marginTop:8 }} />
          <button onClick={sendTest} style={{ marginTop:8 }}>Отправить тест</button>
          <div style={{ minHeight:24, marginTop:8 }}>{msg}</div>
        </div>
      )}
    </div>
  );
}
