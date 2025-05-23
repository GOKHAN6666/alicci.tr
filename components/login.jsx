// src/components/Login.jsx
import { useState } from 'react';
import { supabase } from '../supabaseclient';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Hatalı giriş. Lütfen bilgilerinizi kontrol edin.');
    } else {
      setError('');
      onLogin(); // başarılı girişte AdminPanel'e yönlendir
    }
  };

  return (
    <div className="login-container">
      <h2>Admin Giriş</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Giriş Yap</button>
      </form>
    </div>
  );
}
