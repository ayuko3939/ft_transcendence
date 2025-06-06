import { useState } from "react";

import styles from "../../tournament/components/CreateTournamentModal.module.css";

interface DisplayNameModalProps {
  show: boolean;
  initialDisplayname?: string;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  submitText?: string;
}

export const DisplayNameModal = ({
  show,
  initialDisplayname,
  onClose,
  onSuccess,
  title = "Ready?",
  submitText = "確定",
}: DisplayNameModalProps) => {
  const [displayName, setDisplayName] = useState(initialDisplayname ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // ディスプレイネームを更新
      const displayNameResponse = await fetch("/api/auth/change-displayname", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
        }),
      });

      if (!displayNameResponse.ok) {
        const displayNameData = await displayNameResponse.json();
        throw new Error(
          displayNameData.error || "ディスプレイネームの更新に失敗しました",
        );
      }

      // ディスプレイネーム更新成功後、親コンポーネントに通知
      onSuccess();
      setDisplayName("");
      onClose();
    } catch (error) {
      console.error("ディスプレイネーム更新エラー:", error);
      setError(
        error instanceof Error
          ? error.message
          : "ディスプレイネーム更新に失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setDisplayName("");
    setError("");
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.modalCloseButton}
          onClick={handleClose}
          aria-label="閉じる"
        />

        <h2 className={styles.modalTitle}>{title}</h2>

        <form className={styles.tournamentForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="displayName" className={styles.formLabel}>
              ニックネーム
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={styles.formInput}
              placeholder="ゲーム内で表示される名前を入力"
              maxLength={17}
              required
              disabled={isLoading}
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.buttonContainer}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? "設定中..." : submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
