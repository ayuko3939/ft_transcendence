"use client";

import { useState } from "react";

import styles from "./PasswordChangeModal.module.css";

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PasswordChangeModal({
  isOpen,
  onClose,
}: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 入力値の検証
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("すべての項目を入力してください");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("新しいパスワードが一致しません");
      return;
    }

    if (newPassword.length < 8) {
      setError("新しいパスワードは8文字以上必要です");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // APIエンドポイントを呼び出す
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "パスワード変更に失敗しました");
      }

      // 成功メッセージを表示
      setIsSuccess(true);

      // フォームをリセット
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // 3秒後にモーダルを閉じる
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("パスワード変更エラー:", error);
      setError(
        error instanceof Error ? error.message : "パスワード変更に失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.modalCloseButton}
          onClick={onClose}
          aria-label="閉じる"
        />

        <h2 className={styles.modalTitle}>パスワード変更</h2>

        {isSuccess ? (
          <div className={styles.successMessage}>
            パスワードが正常に変更されました
          </div>
        ) : (
          <form className={styles.passwordForm} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="currentPassword" className={styles.formLabel}>
                現在のパスワード
              </label>
              <input
                id="currentPassword"
                type="password"
                className={styles.formInput}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="newPassword" className={styles.formLabel}>
                新しいパスワード
              </label>
              <input
                id="newPassword"
                type="password"
                className={styles.formInput}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.formLabel}>
                新しいパスワード（確認）
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={styles.formInput}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? "処理中..." : "パスワードを変更する"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
