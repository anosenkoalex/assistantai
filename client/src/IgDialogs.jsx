import React, { useEffect, useState } from 'react';
import { igListContacts, igListThreads, igListEvents, igSetContactStatus } from './api';

export default function IgDialogs() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [events, setEvents] = useState([]);

  async function loadContacts() {
    try {
      const { items, total } = await igListContacts({ take: 50 });
      setContacts(items); setTotal(total);
    } catch {
      setStatus('Ошибка загрузки контактов');
    }
  }

  useEffect(() => { loadContacts(); }, []);

  async function loadThreads(contact) {
    setSelectedContact(contact);
    setSelectedThread(null);
    setEvents([]);
    const res = await igListThreads(contact.id);
    setThreads(res.items || []);
  }

  async function loadEvents(thread) {
    setSelectedThread(thread);
    const res = await igListEvents(thread.id, { take: 200 });
    setEvents(res.items || []);
  }

  async function onStatus(contactId, newStatus) {
    await igSetContactStatus(contactId, newStatus);
    setStatus('Статус обновлён');
    loadContacts();
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, padding: 12 }}>
      <div>
        <h3>Контакты ({total})</h3>
        <div style={{ maxHeight: '70vh', overflow: 'auto', border: '1px solid #ddd' }}>
          {contacts.map(c => {
            const last = c.threads?.[0]?.events?.[0];
            return (
              <div key={c.id} style={{ padding: 8, borderBottom: '1px solid #eee', cursor: 'pointer' }}
                   onClick={() => loadThreads(c)}>
                <div><b>{c.igUserId}</b> • {c.status}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {last?.text ? last.text.slice(0, 80) : '(нет сообщений)'}
                </div>
                <div style={{ marginTop: 4 }}>
                  <button onClick={(e)=>{e.stopPropagation(); onStatus(c.id,'bot')}}>bot</button>{' '}
                  <button onClick={(e)=>{e.stopPropagation(); onStatus(c.id,'manager')}}>manager</button>{' '}
                  <button onClick={(e)=>{e.stopPropagation(); onStatus(c.id,'muted')}}>muted</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3>Треды {selectedContact ? `(${selectedContact.igUserId})` : ''}</h3>
        <div style={{ maxHeight: '70vh', overflow: 'auto', border: '1px solid #ddd' }}>
          {threads.map(t => (
            <div key={t.id} style={{ padding: 8, borderBottom: '1px solid #eee', cursor: 'pointer' }}
                 onClick={() => loadEvents(t)}>
              <div><b>{t.state}</b> • {new Date(t.updatedAt).toLocaleString()}</div>
            </div>
          ))}
          {!threads.length && <div style={{ padding: 8, opacity: 0.7 }}>Выберите контакт</div>}
        </div>
      </div>

      <div>
        <h3>События {selectedThread ? `(${selectedThread.id})` : ''}</h3>
        <div style={{ maxHeight: '70vh', overflow: 'auto', border: '1px solid #ddd', padding: 8 }}>
          {events.map(ev => (
            <div key={ev.id} style={{
              margin: '6px 0',
              textAlign: ev.direction === 'in' ? 'left' : 'right'
            }}>
              <div style={{
                display: 'inline-block',
                background: ev.direction === 'in' ? '#eef' : '#e9ffe9',
                padding: '6px 8px',
                borderRadius: 8,
                maxWidth: '80%'
              }}>
                <div style={{ fontSize: 12, opacity: 0.6 }}>
                  {new Date(ev.at).toLocaleString()} • {ev.type}/{ev.direction}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{ev.text || '(no text)'}</div>
              </div>
            </div>
          ))}
          {!events.length && <div style={{ opacity: 0.7 }}>Выберите тред</div>}
        </div>
      </div>

      <div style={{ gridColumn: '1/-1', minHeight: 20 }}>{status}</div>
    </div>
  );
}

