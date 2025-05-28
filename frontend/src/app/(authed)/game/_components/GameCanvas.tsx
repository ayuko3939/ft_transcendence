import type { GameState } from "../../../../types/shared/types";
import { CANVAS } from "../../../../types/shared/constants";
import styles from "./game.module.css";

interface GameCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameState: GameState;
  countdown: number | null;
  onSurrender: () => void;
}

const GameCanvas = ({
  canvasRef,
  gameState,
  countdown,
  onSurrender,
}: GameCanvasProps) => {
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
        {gameState.status === "countdown" && countdown !== null && (
          <div className={styles.overlay}>
            <div className={styles.countdownText}>{countdown}</div>
          </div>
        )}

        {/* 待機メッセージ表示 */}
        {gameState.status === "waiting" && (
          <div className={styles.overlay}>
            <div className={styles.waitingText}>
              相手プレイヤーを待っています。
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GameCanvas;
