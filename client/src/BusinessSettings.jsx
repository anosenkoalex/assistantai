import { useState, useEffect } from 'react';

export default function BusinessSettings() {
  const [description, setDescription] = useState('');
  const [faq, setFaq] = useState('');
  const [tone, setTone] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/business-data');
        if (res.ok) {
          const data = await res.json();
          setDescription(data.description || '');
          setFaq(data.faq || '');
          setTone(data.tone || '');
        }
      } catch (err) {
        console.error('Failed to load business data', err);
      }
    })();
  }, []);

  const save = async () => {
    try {
      const res = await fetch('/api/admin/business-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, faq, tone }),
      });
      if (res.ok) {
        setStatus('Сохранено');
      } else {
        setStatus('Ошибка');
      }
    } catch (err) {
      console.error('Failed to save business data', err);
      setStatus('Ошибка');
    }
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Настройки бизнеса</h2>
      <div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание бизнеса"
          rows={3}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ marginTop: '10px' }}>
        <textarea
          value={faq}
          onChange={(e) => setFaq(e.target.value)}
          placeholder="FAQ"
          rows={5}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ marginTop: '10px' }}>
        <input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="Тон общения"
          style={{ width: '100%' }}
        />
      </div>
      <button type="button" onClick={save} style={{ marginTop: '10px' }}>
        Сохранить
      </button>
      {status && <span style={{ marginLeft: '10px' }}>{status}</span>}
    </div>
  );
}
