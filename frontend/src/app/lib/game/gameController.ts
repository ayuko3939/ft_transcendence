import type { GameState, PlayerSide } from "src/types/game";
import { PongRenderer } from "./gameRenderer";

// PongSocketClientの代わりに使用するシンプルなインターフェース
interface GameControlInterface {
  sendPaddleMove: (y: number) => void;
}

export class PongController {
  private renderer: PongRenderer;
  private gameInterface: GameControlInterface;
  private gameState: GameState;
  private playerSide: PlayerSide = null;
  private animationId: number | null = null;
  private isSpectator: boolean = false;

  constructor(
    canvas: HTMLCanvasElement,
    initialGameState: GameState,
    gameInterface: GameControlInterface
  ) {
    this.renderer = new PongRenderer(canvas);
    this.gameState = initialGameState;
    this.gameInterface = gameInterface;
  }

  public start(): void {
    this.gameLoop();
    if (!this.isSpectator) {
      this.setupKeyboardListeners();
    }
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.removeKeyboardListeners();
  }

  public setPlayerSide(side: PlayerSide): void {
    this.playerSide = side;
    this.isSpectator = side === "spectator";
    
    // 観戦者モードの場合はキーボードリスナーを削除
    if (this.isSpectator) {
      this.removeKeyboardListeners();
    } else {
      this.setupKeyboardListeners();
    }
  }

  public updateGameState(newState: GameState): void {
    this.gameState = newState;
  }

  private gameLoop = (): void => {
    this.renderer.render(this.gameState);
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private handleKeyPress = (e: KeyboardEvent): void => {
    if (this.isSpectator) return;
    if (!this.playerSide) return;

    const speed = 10;
    let paddleMove = false;
    let newY = 0;

    const paddle =
      this.playerSide === "left"
        ? this.gameState.paddleLeft
        : this.gameState.paddleRight;

    if ((e.key === "ArrowUp" || e.key === "w") && paddle.y > 0) {
      newY = paddle.y - speed;
      paddleMove = true;
    }

    if (
      (e.key === "ArrowDown" || e.key === "s") &&
      paddle.y < (this.renderer.canvas?.height || 600) - paddle.height
    ) {
      newY = paddle.y + speed;
      paddleMove = true;
    }

    if (paddleMove) {
      this.gameInterface.sendPaddleMove(newY);
    }
  };

  private setupKeyboardListeners(): void {
    this.removeKeyboardListeners(); // 既存のリスナーを削除してから追加
    window.addEventListener("keydown", this.handleKeyPress);
  }

  private removeKeyboardListeners(): void {
    window.removeEventListener("keydown", this.handleKeyPress);
  }
}
