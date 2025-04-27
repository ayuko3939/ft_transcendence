"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import GoogleLoginIcon from "./GoogleLoginButton.svg";
import styles from "./GoogleButton.module.css";

interface GoogleButtonProps {
  callbackUrl?: string;
}

export default function GoogleButton({ callbackUrl = "/" }: GoogleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signIn("google", { callbackUrl });
    } catch (error) {
      console.error("ログインエラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={styles.materialButton}
      onClick={handleGoogleLogin}
      disabled={isLoading}
    >
      <div className={styles.state}></div>
      {isLoading ? (
        <span>読み込み中...</span>
      ) : (
        <div className={styles.contentWrapper}>
          <div className={styles.icon}>
            <GoogleLoginIcon />
          </div>
          <span className={styles.contents}>Sign in with Google</span>
          <span style={{ display: "none" }}>Sign in with Google</span>
        </div>
      )}
    </button>
  );
}
