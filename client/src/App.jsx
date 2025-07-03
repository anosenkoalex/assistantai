import { useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState([])

  const sendMessage = async (e) => {
    e.preventDefault()
    const text = message.trim()
    if (!text) return

    setConversation((c) => [...c, { role: 'user', content: text }])
    setMessage('')
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })
      const data = await res.json()
      if (data.reply) {
        setConversation((c) => [...c, { role: 'assistant', content: data.reply }])
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
      <div className="chat">
        {conversation.map((m, idx) => (
          <div key={idx} className={m.role}>
            <strong>{m.role === 'user' ? 'Вы' : 'Ассистент'}:</strong> {m.content}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
