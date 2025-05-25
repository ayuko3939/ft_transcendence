import type { GameResult, PlayerSide } from "../../../../types/shared/types";
import styles from "./game.module.css";

interface GameResultModalProps {
  show: boolean;
  result: GameResult | null;
  playerSide: PlayerSide;
  onBackToHome: () => void;
}

const GameResultModal = ({ show, result, playerSide, onBackToHome }: GameResultModalProps) => {
  if (!show || !result) return null;

  const getResultText = () => {
    if (!playerSide) return "";
    return playerSide === result.winner ? "WIN" : "LOSE";
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.gameOverContent}>
        <h2 className={styles.resultTitle}>
          {getResultText()}
        </h2>
        
        <div className={styles.finalScore}>
          <span>{result.finalScore.left}</span>
          <span className={styles.scoreSeparator}>-</span>
          <span>{result.finalScore.right}</span>
        </div>
        
        {result.message && (
          <p className={styles.resultMessage}>{result.message}</p>
        )}
        
        <button onClick={onBackToHome} className={styles.backButton}>
          戻る
        </button>
      </div>
    </div>
  );
};

export default GameResultModal;
