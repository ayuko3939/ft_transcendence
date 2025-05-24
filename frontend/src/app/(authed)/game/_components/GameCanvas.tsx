import { CANVAS } from "../../../../types/shared/constants";
import styles from "./game.module.css";

interface GameCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  countdown: number | null;
  isGameFinished: boolean;
  onSurrender: () => void;
}

const GameCanvas = ({ 
  canvasRef, 
  countdown, 
  isGameFinished, 
  onSurrender 
}: GameCanvasProps) => {
  const shouldShowCountdown = countdown !== null && !isGameFinished;

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
      </div>
    </>
  );
};

export default GameCanvas;
