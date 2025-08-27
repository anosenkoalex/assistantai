import React, { useState } from 'react';

export default function AdminLogin({ onLoggedIn }) {
  const [token, setToken] = useState('');
  return (
    <div style={{ maxWidth: 420, margin: '60px auto', padding: 16 }}>
      <h2>Admin Login</h2>
      <input
        type="password"
        placeholder="ADMIN_TOKEN"
        value={token}
        onChange={e=>setToken(e.target.value)}
        style={{ width:'100%', padding: 8, margin: '12px 0' }}
      />
      <button onClick={()=>{ localStorage.setItem('ADMIN_TOKEN', token); onLoggedIn?.(); }}>
        Войти
      </button>
    </div>
  );
}
