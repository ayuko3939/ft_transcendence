"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  clientLogError,
  clientLogInfo,
  logUserAction,
} from "@/lib/clientLogger";
import { signIn, useSession } from "next-auth/react";

import GoogleButton from "./components/GoogleButton/GoogleButton";
import ToastRegisterSuccess from "./components/toast-register-success";
import styles from "./login.module.css";

export default function Login() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        <p>Loading...</p>
      </div>
    );
  }
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white">
          <p>Loading...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const isRegistered = searchParams.get("registered") === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError("メールアドレスとパスワードを入力してください");
      clientLogError("ログイン失敗: 入力項目不足");
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
        setError("メールアドレスまたはパスワードが間違っています。");
        clientLogError("ログイン失敗: 認証エラー", { method: "credentials" });
      } else {
        logUserAction("ログイン成功", username);
        router.push("/");
      }
    } catch (error) {
      setError("ログインに失敗しました。もう一度お試しください。");
      clientLogError("ログイン失敗: システムエラー", { method: "credentials" });
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <ToastRegisterSuccess isRegistered={isRegistered} />
      <div className={styles.container}>
        <div className="cyber-container glow-animation">
          <div className="circuit-dot circuit-dot-1" />
          <div className="circuit-dot circuit-dot-2" />
          <h1 className="cyber-title">PONG GAME</h1>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="username" className={styles.formLabel}>
                メールアドレス
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
    </div>
  );
}
