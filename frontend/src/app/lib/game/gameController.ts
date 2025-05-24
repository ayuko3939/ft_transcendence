import type { PongSocketClient } from "@/lib/game/webSocketClient";
import type { GameState, PlayerSide } from "../../../types/shared/types";
import { PADDLE } from "../../../types/shared/constants";

import { PongRenderer } from "./gameRenderer";

export class PongController {
  private renderer: PongRenderer;
  private socketClient: PongSocketClient;
  private gameState: GameState;
  private playerSide: PlayerSide = null;
  private animationId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    initialGameState: GameState,
    socketClient: PongSocketClient,
  ) {
    this.renderer = new PongRenderer(canvas);
    this.gameState = initialGameState;
    this.socketClient = socketClient;
  }

  public start(): void {
    this.gameLoop();
    this.setupKeyboardListeners();
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
  }

  public updateGameState(newState: GameState): void {
    this.gameState = newState;
  }

  private gameLoop = (): void => {
    this.renderer.render(this.gameState);
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private handleKeyPress = (e: KeyboardEvent): void => {
    if (!this.playerSide) return;

    const speed = PADDLE.MOVE_SPEED;
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
      this.socketClient.sendPaddleMove(newY);
    }
  };

  private setupKeyboardListeners(): void {
    window.addEventListener("keydown", this.handleKeyPress);
  }

  private removeKeyboardListeners(): void {
    window.removeEventListener("keydown", this.handleKeyPress);
  }
}
