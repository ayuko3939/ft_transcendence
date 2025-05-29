import type { LocalPongSocketClient } from "@/lib/game/webSocketClient_local";
import type { GameState } from "@ft-transcendence/shared";
import { PADDLE } from "@ft-transcendence/shared";

import { PongRenderer } from "./gameRenderer";

export class LocalPongController {
  private renderer: PongRenderer;
  private socketClient: LocalPongSocketClient;
  private gameState: GameState;
  private animationId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    initialGameState: GameState,
    socketClient: LocalPongSocketClient,
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

  public updateGameState(newState: GameState): void {
    this.gameState = newState;
  }

  private gameLoop = (): void => {
    this.renderer.render(this.gameState);
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private handleKeyPress = (e: KeyboardEvent): void => {
    if (this.gameState.status === "finished") return;

    const speed = PADDLE.MOVE_SPEED;
    let paddleMove = false;
    let newY = 0;
    let playerSide: "left" | "right" | null = null;

    // プレイヤー1（左パドル）: W/S キー
    if (e.key === "w" || e.key === "W") {
      const leftPaddle = this.gameState.paddleLeft;
      if (leftPaddle.y > 0) {
        newY = leftPaddle.y - speed;
        paddleMove = true;
        playerSide = "left";
      }
    }

    if (e.key === "s" || e.key === "S") {
      const leftPaddle = this.gameState.paddleLeft;
      const canvasHeight = this.renderer.canvas?.height || 600;
      if (leftPaddle.y < canvasHeight - leftPaddle.height) {
        newY = leftPaddle.y + speed;
        paddleMove = true;
        playerSide = "left";
      }
    }

    // プレイヤー2（右パドル）: 矢印キー
    if (e.key === "ArrowUp") {
      const rightPaddle = this.gameState.paddleRight;
      if (rightPaddle.y > 0) {
        newY = rightPaddle.y - speed;
        paddleMove = true;
        playerSide = "right";
      }
    }

    if (e.key === "ArrowDown") {
      const rightPaddle = this.gameState.paddleRight;
      const canvasHeight = this.renderer.canvas?.height || 600;
      if (rightPaddle.y < canvasHeight - rightPaddle.height) {
        newY = rightPaddle.y + speed;
        paddleMove = true;
        playerSide = "right";
      }
    }

    // パドル移動をサーバーに送信
    if (paddleMove && playerSide) {
      this.socketClient.sendPaddleMove(newY, playerSide);
    }
  };

  private setupKeyboardListeners(): void {
    window.addEventListener("keydown", this.handleKeyPress);
  }

  private removeKeyboardListeners(): void {
    window.removeEventListener("keydown", this.handleKeyPress);
  }
}
