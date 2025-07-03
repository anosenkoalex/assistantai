import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [businessDescription, setBusinessDescription] = useState('');
  const [productInput, setProductInput] = useState('');
  const [products, setProducts] = useState([]);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqList, setFaqList] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/knowledge', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBusinessDescription(data.businessDescription || '');
          setProducts(data.products || []);
          setFaqList(data.faq || []);
        }
      } catch (err) {
        console.error('Failed to load knowledge', err);
      }
    })();
    (async () => {
      try {
        const res = await fetch('/api/chat/logs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err) {
        console.error('Failed to load logs', err);
      }
    })();
  }, [token, navigate]);

  const addProduct = () => {
    const text = productInput.trim();
    if (!text) return;
    setProducts((c) => [...c, text]);
    setProductInput('');
  };

  const addFaq = () => {
    const q = faqQuestion.trim();
    const a = faqAnswer.trim();
    if (!q || !a) return;
    setFaqList((c) => [...c, { question: q, answer: a }]);
    setFaqQuestion('');
    setFaqAnswer('');
  };

  const saveKnowledge = async () => {
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessDescription, products, faq: faqList }),
      });
      if (res.ok) {
        setSaveStatus('Сохранено');
      } else {
        setSaveStatus('Ошибка');
      }
    } catch (err) {
      console.error('Failed to save knowledge', err);
      setSaveStatus('Ошибка');
    }
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const clearChat = async () => {
    try {
      await fetch('/api/chat/logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear chat', err);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={logout}>Выйти</button>
      <h3>База знаний</h3>
      <textarea
        value={businessDescription}
        onChange={(e) => setBusinessDescription(e.target.value)}
        placeholder="Описание бизнеса"
        rows={3}
        style={{ width: '100%' }}
      />
      <div style={{ marginTop: '10px' }}>
        <input
          value={productInput}
          onChange={(e) => setProductInput(e.target.value)}
          placeholder="Добавить товар"
        />
        <button type="button" onClick={addProduct}>+</button>
        <ul>
          {products.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: '10px' }}>
        <input
          value={faqQuestion}
          onChange={(e) => setFaqQuestion(e.target.value)}
          placeholder="Вопрос"
        />
        <input
          value={faqAnswer}
          onChange={(e) => setFaqAnswer(e.target.value)}
          placeholder="Ответ"
        />
        <button type="button" onClick={addFaq}>Добавить</button>
        <ul>
          {faqList.map((f, i) => (
            <li key={i}>{f.question} - {f.answer}</li>
          ))}
        </ul>
      </div>
      <button type="button" onClick={saveKnowledge}>Сохранить базу знаний</button>
      {saveStatus && <span style={{ marginLeft: '10px' }}>{saveStatus}</span>}

      <div style={{ marginTop: '20px' }}>
        <h3>Логи чата</h3>
        <button onClick={clearChat}>Очистить чат</button>
        <ul>
          {logs.map((m) => (
            <li key={m.id}>{m.role}: {m.content}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
