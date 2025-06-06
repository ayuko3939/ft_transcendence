"use client";

import { useState } from "react";
import { clientLogError, logUserAction } from "@/lib/clientLogger";
import { signIn } from "next-auth/react";

import styles from "./GoogleButton.module.css";
import GoogleLoginIcon from "./GoogleLoginButton.svg";

interface GoogleButtonProps {
  callbackUrl?: string;
}

export default function GoogleButton({ callbackUrl = "/" }: GoogleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signIn("google", {
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        clientLogError("Google認証失敗", { error: result.error });
      } else if (result?.ok) {
        logUserAction("Google認証成功");
      }
    } catch (error) {
      console.error("ログインエラー:", error);
      clientLogError("Google認証エラー");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.materialButton}
      onClick={handleGoogleLogin}
      disabled={isLoading}
    >
      <div className={styles.state} />
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
