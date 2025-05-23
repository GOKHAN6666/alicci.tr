import { useState } from "react";

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      onLogin();
    } else {
      setError("Şifre yanlış");
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>Admin Giriş</h2>
      <form onSubmit={handleLogin}>
        <input
          type="password"
          placeholder="Admin şifresi"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: "10px", fontSize: "16px" }}
        />
        <br /><br />
        <button type="submit" style={{ padding: "10px 20px" }}>Giriş Yap</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
