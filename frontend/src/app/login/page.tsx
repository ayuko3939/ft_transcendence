"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import "./login.css";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError("ユーザー名とパスワードを入力してください");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      
      if (result?.error) {
        setError("ログインに失敗しました。ユーザー名またはパスワードが間違っています。");
      } else {
        router.push("/");
      }
    } catch (error) {
      setError("ログインに失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form-container">
        <div className="circuit-dot circuit-dot-1"></div>
        <div className="circuit-dot circuit-dot-2"></div>
        
        <h1 className="login-title">PONG</h1>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">ユーザー名</label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">パスワード</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
        
        <div className="login-footer">
          ©2025 PONG MASTERS
        </div>
      </div>
    </div>
  );
}
