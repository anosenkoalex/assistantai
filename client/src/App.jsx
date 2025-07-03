import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  return (
    <div className="App">
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
