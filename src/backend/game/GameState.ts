export type GameState = {
  ball: {
    x: number;
    y: number;
    dx: number;
    dy: number;
  };
  paddleLeft: {
    y: number;
  };
  paddleRight: {
    y: number;
  };
  score: {
    left: number;
    right: number;
  };
};

export class GameEngine {
  private readonly BALL_SPEED = 1;
  private readonly CANVAS_WIDTH = 800;
  private readonly CANVAS_HEIGHT = 600;
  private readonly PADDLE_HEIGHT = 100;
  private readonly PADDLE_WIDTH = 10;
  private readonly BALL_RADIUS = 10;

  constructor(private gameState: GameState) {}

  update(): void {
    if (!this.gameState) return;

    // ボールの移動
    this.gameState.ball.x += this.gameState.ball.dx;
    this.gameState.ball.y += this.gameState.ball.dy;

    // 上下の壁との衝突判定
    if (this.gameState.ball.y <= 0 || this.gameState.ball.y >= this.CANVAS_HEIGHT) {
      this.gameState.ball.dy *= -1;
    }

    // パドルとの衝突判定
    this.checkPaddleCollision();

    // 得点判定
    this.checkScore();
  }

  private checkPaddleCollision(): void {
    // 左パドルとの衝突
    if (
      this.gameState.ball.x <= 50 + this.PADDLE_WIDTH &&
      this.gameState.ball.y >= this.gameState.paddleLeft.y &&
      this.gameState.ball.y <= this.gameState.paddleLeft.y + this.PADDLE_HEIGHT
    ) {
      this.gameState.ball.dx *= -1;
    }

    // 右パドルとの衝突
    if (
      this.gameState.ball.x >= this.CANVAS_WIDTH - 50 - this.PADDLE_WIDTH &&
      this.gameState.ball.y >= this.gameState.paddleRight.y &&
      this.gameState.ball.y <= this.gameState.paddleRight.y + this.PADDLE_HEIGHT
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

  private resetBall(): void {
    this.gameState.ball = {
      x: this.CANVAS_WIDTH / 2,
      y: this.CANVAS_HEIGHT / 2,
      dx: this.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: this.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
    };
  }
} 