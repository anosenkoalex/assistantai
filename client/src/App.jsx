import React, { useState, useEffect } from 'react';
import AdminLogin from './AdminLogin';
import Chat from './Chat';
import BusinessSettings from './BusinessSettings';
import IgRules from './IgRules';
import IgDialogs from './IgDialogs';
import IgSettings from './IgSettings';
import IgStats from './IgStats';
import IgRuleStats from './IgRuleStats';

export default function App() {
  const [tab, setTab] = useState('chat');
  const [authed, setAuthed] = useState(false);
  useEffect(()=>{ setAuthed(!!localStorage.getItem('ADMIN_TOKEN')); }, []);

  const adminTabs = ['ig_rules','ig_dialogs','ig_settings','ig_stats','ig_rule_stats'];
  const needAuth = adminTabs.includes(tab);

  if (needAuth && !authed) {
    return <AdminLogin onLoggedIn={()=>setAuthed(true)} />;
  }

  return (
    <div>
      <nav style={{ display:'flex', gap:8, padding:8, borderBottom: '1px solid #eee' }}>
        <button onClick={() => setTab('chat')}>Chat</button>
        <button onClick={() => setTab('settings')}>Settings</button>
        <button onClick={() => setTab('ig_rules')}>IG Rules</button>
        <button onClick={() => setTab('ig_dialogs')}>IG Dialogs</button>
        <button onClick={() => setTab('ig_settings')}>IG Settings</button>
        <button onClick={() => setTab('ig_stats')}>IG Stats</button>
        <button onClick={() => setTab('ig_rule_stats')}>IG Rule Stats</button>
      </nav>
      {tab === 'chat' && <Chat />}
      {tab === 'settings' && <BusinessSettings />}
      {tab === 'ig_rules' && <IgRules />}
      {tab === 'ig_dialogs' && <IgDialogs />}
      {tab === 'ig_settings' && <IgSettings />}
      {tab === 'ig_stats' && <IgStats />}
      {tab === 'ig_rule_stats' && <IgRuleStats />}
    </div>
  );
}

