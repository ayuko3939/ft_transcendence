import type { GameState } from "@ft-transcendence/shared";
import { CANVAS } from "@ft-transcendence/shared";

import styles from "../../game/_components/game.module.css";

interface LocalGameCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameState: GameState;
  countdown: number | null;
  onSurrender: () => void;
}

const LocalGameCanvas = ({
  canvasRef,
  gameState,
  countdown,
  onSurrender,
}: LocalGameCanvasProps) => {
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
      </div>
    </>
  );
};

export default LocalGameCanvas;
