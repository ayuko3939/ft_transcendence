import type { GameState } from "src/types/game";

export class PongRenderer {
  private ctx: CanvasRenderingContext2D;
  public canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context not supported");
    }
    this.ctx = context;
  }

  public render(gameState: GameState): void {
    // キャンバスのクリア
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // パドルの描画
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(
      gameState.paddleLeft.x,
      gameState.paddleLeft.y,
      gameState.paddleLeft.width,
      gameState.paddleLeft.height,
    );
    this.ctx.fillRect(
      gameState.paddleRight.x,
      gameState.paddleRight.y,
      gameState.paddleRight.width,
      gameState.paddleRight.height,
    );

    // ボールの描画
    this.ctx.beginPath();
    this.ctx.arc(
      gameState.ball.x,
      gameState.ball.y,
      gameState.ball.radius,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();

    // スコアの描画
    this.ctx.font = "48px Arial";
    this.ctx.fillText(
      gameState.score.left.toString(),
      this.canvas.width / 4,
      50,
    );
    this.ctx.fillText(
      gameState.score.right.toString(),
      (3 * this.canvas.width) / 4,
      50,
    );

    // 中央線の描画
    this.ctx.setLineDash([5, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.strokeStyle = "white";
    this.ctx.stroke();
  }
}
