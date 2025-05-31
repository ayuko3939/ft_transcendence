import { useState } from "react";

import styles from "./CreateTournamentModal.module.css";

interface CreateTournamentModalProps {
  show: boolean;
  onClose: () => void;
  onTournamentCreated: (tournament: any) => void;
}

export const CreateTournamentModal = ({
  show,
  onClose,
  onTournamentCreated,
}: CreateTournamentModalProps) => {
  const [name, setName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/tournament", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          maxParticipants,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "トーナメントの作成に失敗しました");
      }

      onTournamentCreated(data.tournament);
      setName("");
      setMaxParticipants(4);
      onClose();
    } catch (error) {
      console.error("トーナメント作成エラー:", error);
      setError(
        error instanceof Error
          ? error.message
          : "トーナメント作成に失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setMaxParticipants(4);
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

        <h2 className={styles.modalTitle}>新しいトーナメントを作成</h2>

        <form className={styles.tournamentForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="tournamentName" className={styles.formLabel}>
              トーナメント名
            </label>
            <input
              id="tournamentName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.formInput}
              placeholder="トーナメント名を入力"
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="maxParticipants" className={styles.formLabel}>
              最大参加者数
            </label>
            <select
              id="maxParticipants"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
              className={styles.formSelect}
              disabled={isLoading}
            >
              <option value={2}>2人</option>
              <option value={4}>4人</option>
              <option value={8}>8人</option>
              <option value={16}>16人</option>
            </select>
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
              {isLoading ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
