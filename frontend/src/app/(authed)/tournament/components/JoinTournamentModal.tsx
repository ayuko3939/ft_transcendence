import { useState } from "react";

import styles from "./CreateTournamentModal.module.css";

interface JoinTournamentModalProps {
  show: boolean;
  onClose: () => void;
  onJoinSuccess: () => void;
  tournamentId: string;
}

export const JoinTournamentModal = ({
  show,
  onClose,
  onJoinSuccess,
}: JoinTournamentModalProps) => {
  const [displayName, setDisplayName] = useState("");
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
      onJoinSuccess();
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

        <h2 className={styles.modalTitle}>トーナメントに参加</h2>

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
              placeholder="トーナメント内でのみ有効な名前を入力"
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
              {isLoading ? "参加中..." : "参加"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
