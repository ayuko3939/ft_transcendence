import { CANVAS } from "../../../../types/shared/constants";
import type { GameState, PlayerSide } from "../../../../types/shared/types";
import styles from "./game.module.css";

interface GameCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  countdown: number | null;
  isGameFinished: boolean;
  gameState: GameState;
  showSettings: boolean;
  playerSide: PlayerSide;
  onSurrender: () => void;
}

const GameCanvas = ({ 
  canvasRef, 
  countdown, 
  isGameFinished,
  gameState,
  showSettings,
  playerSide,
  onSurrender 
}: GameCanvasProps) => {
  const shouldShowCountdown = countdown !== null && !isGameFinished;
  const shouldShowWaiting = 
    gameState.status === 'waiting' && 
    !isGameFinished && 
    countdown === null && 
    !showSettings;
    // playerSide === 'right';

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
          <div className={styles.overlay}>
            <div className={styles.countdownText}>{countdown}</div>
          </div>
        )}

        {/* 待機メッセージ表示 */}
        {shouldShowWaiting && (
          <div className={styles.overlay}>
            <div className={styles.waitingText}>相手プレイヤーを待っています。</div>
          </div>
        )}
      </div>
    </>
  );
};

export default GameCanvas;
