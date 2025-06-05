import { useRouter } from "next/navigation";
import { Button } from "@/(authed)/tournament/components/button";

import styles from "./TournamentResult.module.css";

interface TournamentResultProps {
  show: boolean;
  winner: {
    id: number;
    name: string;
    score: number;
  };
  onClose: () => void;
}

export const TournamentResult = ({
  show,
  winner,
  onClose,
}: TournamentResultProps) => {
  const router = useRouter();
  if (!show) return null;

  const handleClose = () => {
    onClose();
  };

  const handleReturnToLobby = () => {
    router.push("/tournament");
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
        <div className={styles.resultContainer}>
          <h1 className={styles.resultTitle}>
            <p>Tournament Champion!</p>
          </h1>
          <div className={styles.winnerSection}>
            <div className={styles.trophy}>🏆</div>
            <div className={styles.winnerName}>{winner.name}</div>
            <div className={styles.winnerScore}>Score: {winner.score}</div>
          </div>

          <div className={styles.buttonContainer}>
            <Button
              onClick={handleReturnToLobby}
              className={styles.returnButton}
            >
              ロビーに戻る
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
