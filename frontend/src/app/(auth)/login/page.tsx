"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

import GoogleButton from "./components/GoogleButton/GoogleButton";
import styles from "./login.module.css";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { status } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        <p>Loading...</p>
      </div>
    );
  }

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
        setError(
          "ログインに失敗しました。ユーザー名またはパスワードが間違っています。",
        );
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
    <div className={styles.container}>
      <div className="cyber-container glow-animation">
        <div className="circuit-dot circuit-dot-1" />
        <div className="circuit-dot circuit-dot-2" />
        <h1 className="cyber-title">PONG GAME</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.formLabel}>
              ユーザー名
            </label>
            <input
              id="username"
              type="text"
              className={styles.formInput}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              パスワード
            </label>
            <input
              id="password"
              type="password"
              className={styles.formInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="cyber-button" disabled={isLoading}>
            {isLoading ? (
              <div className="flex justify-center">
                <div className="size-6 animate-spin rounded-full border-2 border-solid border-white" />
              </div>
            ) : (
              "ログイン"
            )}
          </button>
        </form>
        <div className="flex justify-center py-5 text-sm">
          アカウントが必要ですか？
          <Link href="/signup">
            <span className="text-cyan-400">登録</span>
          </Link>
        </div>
        <div className={styles.googleButtonContainer}>
          <GoogleButton callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
