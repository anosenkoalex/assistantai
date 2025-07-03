import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const bottomRef = useRef(null)

  const [businessDescription, setBusinessDescription] = useState('')
  const [productInput, setProductInput] = useState('')
  const [products, setProducts] = useState([])
  const [faqQuestion, setFaqQuestion] = useState('')
  const [faqAnswer, setFaqAnswer] = useState('')
  const [faqList, setFaqList] = useState([])
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/knowledge')
        if (res.ok) {
          const data = await res.json()
          setBusinessDescription(data.businessDescription || '')
          setProducts(data.products || [])
          setFaqList(data.faq || [])
        }
      } catch (err) {
        console.error('Failed to load knowledge', err)
      }
    })()
  }, [])

  const sendMessage = async (e) => {
    e.preventDefault()
    const text = message.trim()
    if (!text) return

    setMessages((c) => [...c, { role: 'user', content: text }])
    setMessage('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })
      const data = await res.json()
      if (data.reply) {
        setMessages((c) => [...c, { role: 'assistant', content: data.reply }])
      }
    } catch (err) {
      console.error('Error sending message', err)
    }
  }

  const addProduct = () => {
    const text = productInput.trim()
    if (!text) return
    setProducts((c) => [...c, text])
    setProductInput('')
  }

  const addFaq = () => {
    const q = faqQuestion.trim()
    const a = faqAnswer.trim()
    if (!q || !a) return
    setFaqList((c) => [...c, { question: q, answer: a }])
    setFaqQuestion('')
    setFaqAnswer('')
  }

  const saveKnowledge = async () => {
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDescription, products, faq: faqList })
      })
      if (res.ok) {
        setSaveStatus('Сохранено')
      } else {
        setSaveStatus('Ошибка')
      }
    } catch (err) {
      console.error('Failed to save knowledge', err)
      setSaveStatus('Ошибка')
    }
    setTimeout(() => setSaveStatus(''), 3000)
  }

  return (
    <div className="App">
      <div style={{ border: '1px solid #555', padding: '10px', marginBottom: '20px' }}>
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
      </div>
      <form onSubmit={sendMessage} className="form">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Введите сообщение"
        />
        <button type="submit">Отправить</button>
      </form>
      <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px' }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{ margin: '10px 0', color: m.role === 'user' ? '#0f0' : '#0ff' }}
          >
            <strong>{m.role === 'user' ? 'Вы' : 'Ассистент'}:</strong> {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <button onClick={() => setMessages([])}>Очистить чат</button>
    </div>
  )
}

export default App
