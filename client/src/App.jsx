import React, { useState } from 'react';
import Chat from './Chat';
import BusinessSettings from './BusinessSettings';
import IgRules from './IgRules';
import IgDialogs from './IgDialogs';
import IgSettings from './IgSettings';
import IgStats from './IgStats';

export default function App() {
  const [tab, setTab] = useState('chat');

  return (
    <div>
      <nav style={{ display:'flex', gap:8, padding:8, borderBottom: '1px solid #eee' }}>
        <button onClick={() => setTab('chat')}>Chat</button>
        <button onClick={() => setTab('settings')}>Settings</button>
        <button onClick={() => setTab('ig_rules')}>IG Rules</button>
        <button onClick={() => setTab('ig_dialogs')}>IG Dialogs</button>
        <button onClick={() => setTab('ig_settings')}>IG Settings</button>
        <button onClick={() => setTab('ig_stats')}>IG Stats</button>
      </nav>
      {tab === 'chat' && <Chat />}
      {tab === 'settings' && <BusinessSettings />}
      {tab === 'ig_rules' && <IgRules />}
      {tab === 'ig_dialogs' && <IgDialogs />}
      {tab === 'ig_settings' && <IgSettings />}
      {tab === 'ig_stats' && <IgStats />}
    </div>
  );
}

