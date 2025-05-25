import { CANVAS } from "../../../../types/shared/constants";
import styles from "./game.module.css";

interface GameCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  countdown: number | null;
  isGameFinished: boolean;
  isWaitingForPlayer: boolean;
  onSurrender: () => void;
}

const GameCanvas = ({ 
  canvasRef, 
  countdown, 
  isGameFinished,
  isWaitingForPlayer, 
  onSurrender 
}: GameCanvasProps) => {
  const shouldShowCountdown = countdown !== null && !isGameFinished;
  const shouldShowWaiting = isWaitingForPlayer && !isGameFinished && countdown === null;

  return (
    <>
      {/* 中断ボタン */}
      <div className={styles.surrenderButtonContainer}>
        <button onClick={onSurrender} className={styles.surrenderButton}>
          中断
        </button>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={CANVAS.WIDTH}
          height={CANVAS.HEIGHT}
          className={styles.canvas}
        />

        {/* カウントダウン表示 */}
        {shouldShowCountdown && (
          <div className={styles.countdownOverlay}>
            <div className={styles.countdownText}>{countdown}</div>
          </div>
        )}

        {/* 待機メッセージ表示 */}
        {shouldShowWaiting && (
          <div className={styles.countdownOverlay}>
            <div className={styles.waitingText}>相手プレイヤーを待っています。</div>
          </div>
        )}
      </div>
    </>
  );
};

export default GameCanvas;
