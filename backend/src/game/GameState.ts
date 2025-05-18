import { GameState } from '../types';

export class GameEngine {
  private readonly BALL_SPEED = 5;
  private readonly CANVAS_WIDTH = 800;
  private readonly CANVAS_HEIGHT = 600;
  private readonly PADDLE_HEIGHT = 100;
  private readonly PADDLE_WIDTH = 10;
  private readonly BALL_RADIUS = 10;

  constructor(private gameState: GameState) {
    // ゲーム状態にゲーム終了フラグとウィナーが含まれていない場合は初期化
    if (this.gameState.gameOver === undefined) {
      this.gameState.gameOver = false;
    }
    if (this.gameState.winner === undefined) {
      this.gameState.winner = null;
    }
    // 勝利点数が設定されていない場合はデフォルト値を設定
    if (this.gameState.winningScore === undefined) {
      this.gameState.winningScore = 10; // デフォルトは10点
    }
  }

  update(): void {
    // ゲームが終了している場合は更新しない
    if (!this.gameState || this.gameState.gameOver) return;

    // ボールの移動
    this.gameState.ball.x += this.gameState.ball.dx;
    this.gameState.ball.y += this.gameState.ball.dy;

    // 上下の壁との衝突判定
    if (
      this.gameState.ball.y <= 0 ||
      this.gameState.ball.y >= this.CANVAS_HEIGHT
    ) {
      this.gameState.ball.dy *= -1;
    }

    // パドルとの衝突判定
    this.checkPaddleCollision();

    // 得点判定
    this.checkScore();

    // 勝者判定
    this.checkWinner();
  }

  private checkPaddleCollision(): void {
    // 左パドルとの衝突
    if (
      this.gameState.ball.x <=
        this.gameState.paddleLeft.x + this.gameState.paddleLeft.width &&
      this.gameState.ball.y >= this.gameState.paddleLeft.y &&
      this.gameState.ball.y <=
        this.gameState.paddleLeft.y + this.gameState.paddleLeft.height
    ) {
      this.gameState.ball.dx *= -1;
    }

    // 右パドルとの衝突
    if (
      this.gameState.ball.x >= this.gameState.paddleRight.x &&
      this.gameState.ball.y >= this.gameState.paddleRight.y &&
      this.gameState.ball.y <=
        this.gameState.paddleRight.y + this.gameState.paddleRight.height
    ) {
      this.gameState.ball.dx *= -1;
    }
  }

  private checkScore(): void {
    // 左側の得点
    if (this.gameState.ball.x >= this.CANVAS_WIDTH) {
      this.gameState.score.left++;
      this.resetBall();
    }
    // 右側の得点
    if (this.gameState.ball.x <= 0) {
      this.gameState.score.right++;
      this.resetBall();
    }
  }

  // 勝者判定を追加
  private checkWinner(): void {
    // 勝利点数を取得（デフォルトは10点）
    const winningScore = this.gameState.winningScore || 10;
    
    if (this.gameState.score.left >= winningScore) {
      this.gameState.gameOver = true;
      this.gameState.winner = 'left';
    } else if (this.gameState.score.right >= winningScore) {
      this.gameState.gameOver = true;
      this.gameState.winner = 'right';
    }
  }

  private resetBall(): void {
    this.gameState.ball = {
      x: this.CANVAS_WIDTH / 2,
      y: this.CANVAS_HEIGHT / 2,
      dx: this.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: this.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      radius: this.BALL_RADIUS,
    };
  }
}
